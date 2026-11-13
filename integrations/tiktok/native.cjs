'use strict';
exports.install=()=>{
 const {ipcMain,shell}=require('electron');
 ipcMain.handle('senz-tiktok-open',async(event,value)=>{
  if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame.url.startsWith('senz://app/'))throw Error('Invalid caller');
  const u=new URL(value);if(u.protocol!=='https:'||!(['services.tiktokshop.com','services.us.tiktokshop.com'].includes(u.hostname)||(u.origin==='https://senz-tiktok-production.up.railway.app'&&u.pathname==='/connect')||(u.origin==='https://railway.com'&&u.pathname==='/project/e5d400df-27d3-4487-822d-b2ede45cc8d8'))||u.username||u.password)throw Error('Invalid TikTok authorization URL');
  await shell.openExternal(u.href);return true;
 });
};
