// Electron workArea dimensions are already device-independent pixels: do not
// divide by scaleFactor again (125/150% Windows scaling is already accounted for).
function displayZoom(display){
 const a=display.workAreaSize||display.workArea;
 if(a.width>=3400&&a.height>=1700)return 1.35;
 if(a.width>=2400&&a.height>=1200)return 1.15;
 if(a.width<=1280||a.height<=700)return .8;
 if(a.width<=1400||a.height<=780)return .85;
 if(a.width<=1600||a.height<=900)return .9;
 return display.internal===true?.9:1;
}
function initialBounds(display){
 const a=display.workArea,large=a.width>=2400&&a.height>=1200,w=large?Math.round(a.width*.86):Math.min(1540,a.width),h=large?Math.round(a.height*.86):Math.min(1050,a.height);
 return {width:w,height:h,x:a.x+Math.round((a.width-w)/2),y:a.y+Math.round((a.height-h)/2),minWidth:Math.min(800,a.width),minHeight:Math.min(500,a.height)};
}
function installAdaptiveDisplay(window,screen,{isFocusMode=()=>false}={}){
 // Capture while alive: BrowserWindow.webContents throws after closed.
 const contents=window.webContents;
 let timer,closed=false;
 const apply=()=>{
  if(closed||window.isDestroyed()||contents.isDestroyed())return;
  const factor=isFocusMode()?1:displayZoom(screen.getDisplayMatching(window.getBounds()));
  if(Math.abs(contents.getZoomFactor()-factor)>.001)contents.setZoomFactor(factor);
 };
 const schedule=()=>{if(closed)return;clearTimeout(timer);timer=setTimeout(apply,160);};
 window.on('move',schedule);window.on('resize',schedule);
 contents.on('did-finish-load',apply);
 screen.on('display-metrics-changed',schedule);screen.on('display-added',schedule);screen.on('display-removed',schedule);
 window.once('closed',()=>{closed=true;clearTimeout(timer);for(const event of ['display-metrics-changed','display-added','display-removed'])screen.removeListener(event,schedule);window.removeListener('move',schedule);window.removeListener('resize',schedule);contents.removeListener('did-finish-load',apply);});
 return {apply};
}
module.exports={displayZoom,initialBounds,installAdaptiveDisplay};

// Resize visible auxiliary windows as well as their contents. Saved bounds are
// already screen pixels; fit them without repeatedly shrinking on every reopen.
function installAuxiliaryDisplay(win,screen,{restored=false}={}){
 // EventEmitter cleanup remains safe on the captured WebContents object.
 const contents=win.webContents;
 let timer,closed=false,lastFactor=null;
 const minimum=win.getMinimumSize();
 const apply=()=>{
  if(closed||win.isDestroyed()||contents.isDestroyed())return;
  const bounds=win.getBounds(),display=screen.getDisplayMatching(bounds),area=display.workArea;
  const factor=displayZoom(display);
  win.setMinimumSize(Math.min(area.width,Math.round(minimum[0]*factor)),Math.min(area.height,Math.round(minimum[1]*factor)));
  if(!win.isMaximized()&&!win.isFullScreen()){
   const ratio=lastFactor===null?(restored?1:factor):factor/lastFactor;
   const width=Math.min(area.width,Math.max(1,Math.round(bounds.width*ratio)));
   const height=Math.min(area.height,Math.max(1,Math.round(bounds.height*ratio)));
   const next={width,height,x:Math.max(area.x,Math.min(bounds.x,area.x+area.width-width)),y:Math.max(area.y,Math.min(bounds.y,area.y+area.height-height))};
   if(Object.keys(next).some(k=>next[k]!==bounds[k]))win.setBounds(next,false);
  }
  lastFactor=factor;
  if(Math.abs(contents.getZoomFactor()-factor)>.001)contents.setZoomFactor(factor);
 };
 const schedule=()=>{if(closed)return;clearTimeout(timer);timer=setTimeout(apply,160);};
 win.on('move',schedule);win.on('resize',schedule);win.on('restore',schedule);win.on('leave-full-screen',schedule);win.on('unmaximize',schedule);
 contents.on('did-finish-load',apply);
 for(const event of ['display-metrics-changed','display-added','display-removed'])screen.on(event,schedule);
 win.once('closed',()=>{closed=true;clearTimeout(timer);for(const event of ['display-metrics-changed','display-added','display-removed'])screen.removeListener(event,schedule);for(const event of ['move','resize','restore','leave-full-screen','unmaximize'])win.removeListener(event,schedule);contents.removeListener('did-finish-load',apply);});
 apply();return {apply};
}
module.exports.installAuxiliaryDisplay=installAuxiliaryDisplay;
