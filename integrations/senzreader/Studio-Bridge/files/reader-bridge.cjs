'use strict';
const http=require('http'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const PORT=47831;
function validItems(items){return Array.isArray(items)&&items.length>0&&items.length<=500&&items.every(i=>typeof i.id==='string'&&i.id.length<500&&typeof i.name==='string'&&i.name.length<=250&&typeof i.font==='string'&&i.font.length<200&&(i.widthIn===null||(Number.isFinite(i.widthIn)&&i.widthIn>=.01&&i.widthIn<=100))&&(i.color===null||/^#[0-9a-f]{6}$/i.test(i.color))&&Number.isInteger(i.quantity)&&i.quantity>=1&&i.quantity<=200)&&items.reduce((n,i)=>n+i.quantity,0)<=500;}
function makeHandler(token,jobs,onQueued=()=>{}){return (req,res)=>{
 const origin=req.headers.origin||'';if(origin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin)){res.writeHead(403);return res.end();}
 if(req.headers.host!==`127.0.0.1:${PORT}`){res.writeHead(403);return res.end();}
 if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Senz-Token');
 const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
 const given=Buffer.from(String(req.headers['x-senz-token']||'')),expected=Buffer.from(token);
 if(given.length!==expected.length||!crypto.timingSafeEqual(given,expected))return reply(401,{error:'Incorrect pairing code.'});
 if(req.method==='GET'&&req.url==='/health')return reply(200,{service:'senz-reader-bridge',version:3});
 if(req.method==='GET'&&req.url.startsWith('/status/')){const job=jobs.get(req.url.slice(8));return job?reply(200,{status:job.status,count:job.count||0,error:job.error||''}):reply(404,{error:'Job not found.'});}
 if(req.method!=='POST'||req.url!=='/orders')return reply(404,{error:'Not found'});
 let body='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>1024*1024){req.destroy();return;}body+=chunk;});
 req.on('end',()=>{try{const data=JSON.parse(body);if(!/^[a-zA-Z0-9-]{10,80}$/.test(data.requestId)||!validItems(data.items))return reply(400,{error:'Invalid order data (maximum 500 copies).'});const existing=jobs.get(data.requestId);if(existing)return reply(200,{jobId:data.requestId,status:existing.status});for(const [id,j] of jobs)if(Date.now()-j.time>3600000)jobs.delete(id);if(jobs.size>=100)return reply(429,{error:'Too many submissions. Try again later.'});jobs.set(data.requestId,{items:data.items,status:'queued',time:Date.now()});reply(202,{jobId:data.requestId,status:'queued'});try{onQueued();}catch{}}catch(e){reply(400,{error:'Invalid JSON.'});}});
 };}
exports.install=()=>{
 const {app,ipcMain}=require('electron');const jobs=new Map();let token='',serverError='';
 const check=e=>{if(e.senderFrame!==e.sender.mainFrame||!e.senderFrame.url.startsWith('senz://app/'))throw Error('Invalid caller');};
 app.whenReady().then(()=>{const file=path.join(app.getPath('userData'),'senz-reader-token.txt');try{token=fs.readFileSync(file,'utf8').trim();}catch{}if(!/^[a-f0-9]{64}$/.test(token)){token=crypto.randomBytes(32).toString('hex');fs.writeFileSync(file,token,{mode:0o600});}const server=http.createServer(makeHandler(token,jobs,()=>{const {BrowserWindow}=require('electron');const win=BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()&&w.webContents.getURL().startsWith('senz://app/index.html'));if(win){win.webContents.setBackgroundThrottling(false);if(win.isMinimized())win.restore();win.show();win.focus();}}));server.on('error',e=>{serverError=e.message;});server.listen(PORT,'127.0.0.1');app.on('before-quit',()=>server.close());});
 ipcMain.handle('senz-reader-config',e=>{check(e);return {token,port:PORT,error:serverError};});
 ipcMain.handle('senz-reader-review',(e,r)=>{check(e);const j=jobs.get(r.id);if(j)j.status='awaiting_review';return true;});
 ipcMain.handle('senz-reader-install-plugin',async e=>{check(e);const {shell,clipboard}=require('electron');const {spawn}=require('child_process');const destination=path.join(app.getPath('userData'),'SENZReader-Chrome');fs.mkdirSync(destination,{recursive:true});fs.cpSync(path.join(__dirname,'reader-extension'),destination,{recursive:true});fs.writeFileSync(path.join(destination,'bridge-defaults.json'),JSON.stringify({token}),{mode:0o600});clipboard.writeText(destination);const locations=[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).map(p=>path.join(p,'Google','Chrome','Application','chrome.exe'));const chrome=locations.find(p=>fs.existsSync(p));if(chrome){const child=spawn(chrome,['chrome://extensions/'],{detached:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}await shell.openPath(destination);return {path:destination,chromeOpened:!!chrome};});
 ipcMain.handle('senz-reader-take',e=>{check(e);for(const [id,j] of jobs)if(j.status==='queued'){j.status='processing';return {id,items:j.items};}return null;});
 ipcMain.handle('senz-reader-result',(e,r)=>{check(e);const j=jobs.get(r.id);if(j&&['processing','awaiting_review'].includes(j.status)){j.status=r.error?'error':'imported';j.error=String(r.error||'').slice(0,500);j.count=Number(r.count)||0;}return true;});
};
exports.makeHandler=makeHandler;exports.validItems=validItems;
