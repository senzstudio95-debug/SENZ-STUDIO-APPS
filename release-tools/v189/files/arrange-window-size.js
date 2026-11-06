function install(win){
 if(win.querySelector('.aa-window-resize'))return;
 const handle=document.createElement('button');handle.type='button';handle.className='aa-window-resize';handle.setAttribute('aria-label','Resize Auto Arrange');handle.title='Drag to resize · Arrow keys resize · Double-click to reset';win.append(handle);
 let gesture=null;
 const bounds=()=>({w:Math.max(1,innerWidth-16),h:Math.max(1,innerHeight-16)});
 function fit(x,y,w,h){const b=bounds();w=Math.min(b.w,Math.max(Math.min(560,b.w),w));h=Math.min(b.h,Math.max(Math.min(360,b.h),h));x=Math.max(8,Math.min(innerWidth-w-8,x));y=Math.max(8,Math.min(innerHeight-h-8,y));Object.assign(win.style,{transform:'none',left:x+'px',top:y+'px',width:w+'px',height:h+'px'});}
 function reset(){for(const k of ['width','height','left','top','transform'])win.style.removeProperty(k);}
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const r=win.getBoundingClientRect();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,...{left:r.left,top:r.top,w:r.width,h:r.height}};fit(r.left,r.top,r.width,r.height);handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;e.preventDefault();const g=gesture;fit(g.left,g.top,g.w+e.clientX-g.x,g.h+e.clientY-g.y);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,e=>{if(gesture?.id===e.pointerId){gesture=null;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}});
 handle.addEventListener('dblclick',reset);
 handle.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();reset();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const r=win.getBoundingClientRect(),step=e.shiftKey?40:10;fit(r.left,r.top,r.width+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),r.height+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));});
 window.addEventListener('resize',()=>{if(win.open){const r=win.getBoundingClientRect();fit(r.left,r.top,r.width,r.height);}});
}
const observer=new MutationObserver(()=>{const win=document.querySelector('.auto-arrange-window');if(win){install(win);observer.disconnect();}});
const win=document.querySelector('.auto-arrange-window');if(win)install(win);else observer.observe(document.documentElement,{childList:true,subtree:true});
