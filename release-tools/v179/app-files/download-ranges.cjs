'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
// Four bounded streams; each response must describe exactly the requested bytes.
exports.parallelDownload=async function(info,folder,{open,signal,onProgress=()=>{},onVerifying=()=>{},verifyInstaller}){
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)throw Error('Download cancelled.');signal?.addEventListener('abort',abort,{once:true});
 const temp=path.join(folder,crypto.randomUUID()+'.part'),file=path.join(folder,info.name);let handle;const active=new Set();
 try{
  const probe=await open(info.url,{signal:controller.signal,range:'bytes=0-0'});active.add(probe);
  if(probe.statusCode!==206||probe.headers?.['content-range']!==`bytes 0-0/${info.size}`){probe.destroy();throw Error('Range download unsupported.');}
  let probeBytes=0;for await(const chunk of probe){probeBytes+=chunk.length;if(probeBytes>1){probe.destroy();throw Error('Invalid range probe.');}}active.delete(probe);if(probeBytes!==1)throw Error('Incomplete range probe.');
  handle=await fs.open(temp,'wx',0o600);await handle.truncate(info.size);
  const chunkSize=8*1024*1024,count=Math.ceil(info.size/chunkSize),received=Array(count).fill(0);let next=0,last=0;
  async function worker(){while(next<count){const index=next++,start=index*chunkSize,end=Math.min(info.size-1,start+chunkSize-1),length=end-start+1;let done=false;
   for(let attempt=0;attempt<3&&!done;attempt++){let response;received[index]=0;try{
    if(controller.signal.aborted)throw Error('Download cancelled.');response=await open(info.url,{signal:controller.signal,range:`bytes=${start}-${end}`});active.add(response);
    if(response.statusCode!==206||response.headers?.['content-range']!==`bytes ${start}-${end}/${info.size}`||response.headers?.['content-encoding']&&response.headers['content-encoding']!=='identity')throw Error('Invalid range response.');
    let n=0;for await(const chunk of response){if(controller.signal.aborted)throw Error('Download cancelled.');if(n+chunk.length>length)throw Error('Range exceeds expected size.');let offset=0;while(offset<chunk.length){const {bytesWritten}=await handle.write(chunk,offset,chunk.length-offset,start+n+offset);if(!bytesWritten)throw Error('Cannot write installer.');offset+=bytesWritten;}n+=chunk.length;received[index]=n;if(Date.now()-last>150){last=Date.now();onProgress(received.reduce((a,b)=>a+b,0),info.size);}}
    if(n!==length)throw Error('Incomplete range download.');done=true;
   }catch(e){response?.destroy();if(controller.signal.aborted||attempt===2)throw e;}finally{if(response)active.delete(response);}}
  }}
  const workers=Array.from({length:Math.min(4,count)},()=>worker().catch(e=>{controller.abort();for(const stream of active)stream.destroy();throw e;}));const results=await Promise.allSettled(workers);const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;
  if(signal?.aborted)throw Error('Download cancelled.');await handle.sync();await handle.close();handle=null;onVerifying();await verifyInstaller(temp,info);if(signal?.aborted)throw Error('Download cancelled.');await fs.rm(file,{force:true});await fs.rename(temp,file);onProgress(info.size,info.size);return file;
 }finally{controller.abort();for(const stream of active)stream.destroy();signal?.removeEventListener('abort',abort);await handle?.close().catch(()=>{});await fs.rm(temp,{force:true}).catch(()=>{});}
};
