const {contextBridge,ipcRenderer}=require('electron');
if(process.isMainFrame)contextBridge.exposeInMainWorld('tube',{call:(action,payload)=>ipcRenderer.invoke('senz-tube-call',action,payload),onState:callback=>{const handler=(_e,s)=>callback(s);ipcRenderer.on('senz-tube-state',handler);return()=>ipcRenderer.removeListener('senz-tube-state',handler);}});
