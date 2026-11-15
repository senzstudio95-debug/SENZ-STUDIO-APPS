'use strict';
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),crypto=require('node:crypto');
const MODEL={bytes:175997641,sha256:'8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491',url:'https://github.com/senzstudio95-debug/SENZ-STUDIO-APPS/releases/download/v2.9.201/U2NET-DETAILED.onnx'};
function createOptionalAI({cacheDir,fetch,model=MODEL}){
 let pending;
 async function valid(file){try{if((await fsp.stat(file)).size!==model.bytes)return false;const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex')===model.sha256;}catch{return false;}}
 async function download(){
  const dir=cacheDir(),file=path.join(dir,'u2net-'+model.sha256+'.onnx');await fsp.mkdir(dir,{recursive:true});
  if(await valid(file))return file;
  await fsp.rm(file,{force:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';let handle;
  try{
   const response=await fetch(model.url,{signal:AbortSignal.timeout(10*60*1000)});if(!response.ok||!response.body)throw Error('Model download failed ('+response.status+').');
   const length=Number(response.headers.get('content-length'));if(length&&length!==model.bytes)throw Error('Unexpected model download size.');
   handle=await fsp.open(temp,'wx');const hash=crypto.createHash('sha256');let bytes=0;
   for await(const chunk of response.body){bytes+=chunk.length;if(bytes>model.bytes)throw Error('Model download is too large.');hash.update(chunk);await handle.writeFile(chunk);}
   if(bytes!==model.bytes||hash.digest('hex')!==model.sha256)throw Error('Model verification failed. Please retry.');
   await handle.sync();await handle.close();handle=null;await fsp.rename(temp,file);return file;
  }finally{await handle?.close();await fsp.rm(temp,{force:true}).catch(()=>{});}
 }
 return{ensure(){if(!pending)pending=download().catch(e=>{pending=null;throw e;});return pending;}};
}
module.exports={createOptionalAI,MODEL};
