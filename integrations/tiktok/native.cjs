'use strict';
exports.install=()=>{
 const {ipcMain,shell}=require('electron');
 ipcMain.handle('senz-tiktok-open',async(event,value)=>{
  if(event.senderFrame!==event.sender.mainFrame||!event.senderFrame.url.startsWith('senz://app/'))throw Error('Invalid caller');
  const u=new URL(value);if(u.protocol!=='https:'||!['services.tiktokshop.com','services.us.tiktokshop.com'].includes(u.hostname)||u.username||u.password)throw Error('Invalid TikTok authorization URL');
  await shell.openExternal(u.href);return true;
 });
};
