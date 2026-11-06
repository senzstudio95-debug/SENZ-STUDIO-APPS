export function installCompactWorkspace(windows){
 const root=document.documentElement,values={};
 const header=document.querySelector('.topbar'),stripRow=document.createElement('div');stripRow.className='desktop-toolbar-row';header.insertBefore(stripRow,header.querySelector('.main-nav'));const rowContent=document.createElement('div');rowContent.className='desktop-toolbar-content';stripRow.append(rowContent);rowContent.append(header.querySelector('.main-nav'),header.querySelector('.mode-dock'));
 const headerContent=document.createElement('div');headerContent.className='desktop-header-content';header.insertBefore(headerContent,header.firstChild);headerContent.append(header.querySelector('.brand-zone'),stripRow);const utility=header.querySelector('.utility-dock');header.append(utility);
 // Measure unscaled layout. CSS transforms never feed back into this width.
 let headerFrame=0,lastScale=-1,lastWidth=-1,lastContentWidth=-1;
 const fitHeader=()=>{if(headerFrame)return;headerFrame=requestAnimationFrame(()=>{headerFrame=0;if(document.body.classList.contains('focus-mode')||!header.clientWidth)return;const css=getComputedStyle(header),available=Math.max(1,header.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)-utility.offsetWidth-10),natural=[...headerContent.children].reduce((width,child)=>width+child.offsetWidth,0)+20;const scale=Math.floor(Math.min(innerWidth>=3000?1.45:innerWidth>=2200?1.18:.94,Math.max(.1,available/Math.max(1,natural)))*1000)/1000;const contentWidth=Math.floor(available/scale);if(contentWidth!==lastContentWidth){lastContentWidth=contentWidth;headerContent.style.width=contentWidth+'px';}if(scale===lastScale)return;lastScale=scale;headerContent.style.transform=`scale(${scale})`;root.style.setProperty('--header-fit',String(scale));});};
 new ResizeObserver(()=>{const width=header.clientWidth;if(width===lastWidth)return;lastWidth=width;fitHeader();}).observe(header);
 new ResizeObserver(fitHeader).observe(utility);
 new MutationObserver(fitHeader).observe(headerContent,{childList:true,subtree:true,characterData:true});
 new MutationObserver(fitHeader).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.fonts.ready.then(fitHeader);document.fonts.addEventListener('loadingdone',fitHeader);window.addEventListener('resize',fitHeader);fitHeader();
 // Fit every thumbnail uniformly to the actual remaining panel space.
 // Resizing this UI must never modify the document's text or physical dimensions.
 const strip=document.querySelector('.asset-dock .font-strip');
 if(strip){
  let previous='';
  const fitAssets=()=>{
   const css=getComputedStyle(strip);
   const width=strip.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
   // Border-box height does not oscillate when the horizontal scrollbar changes.
   const height=strip.offsetHeight-parseFloat(css.borderTopWidth)-parseFloat(css.borderBottomWidth)-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-12;
   if(width<=0||height<=0)return;
   const scale=Math.max(.1,Math.min(1.5,(height-4)/82));
   const next=(Math.floor(scale*1000)/1000).toString();
   if(next!==previous){strip.style.setProperty('--asset-scale',next);previous=next;}
  };
  new ResizeObserver(fitAssets).observe(strip);
  fitAssets();
 }

 const limits=key=>key==='toolbar'?{min:parseFloat(getComputedStyle(document.querySelector('.topbar')).minHeight)||124,max:Math.max(240,innerHeight*.3)}:{min:152,max:Math.max(152,Math.min(360,innerHeight*.45))};
 const get=key=>parseFloat(getComputedStyle(root).getPropertyValue(key==='toolbar'?'--toolbar-height':'--assets-height'));
 const set=(key,value)=>{const {min,max}=limits(key);values[key]=Math.round(Math.max(min,Math.min(max,value)));root.style.setProperty(key==='toolbar'?'--toolbar-height':'--assets-height',values[key]+'px');const el=document.querySelector(`[data-resize-workspace="${key}"]`);el?.setAttribute('aria-valuenow',values[key]);};
 function reset(){for(const key of ['toolbar','assets']){delete values[key];root.style.removeProperty(key==='toolbar'?'--toolbar-height':'--assets-height');}}
 for(const [key,selector,direction,label] of [['assets','.asset-dock',-1,'Fonts and assets panel height']]){
  const host=document.querySelector(selector),handle=document.createElement('div');handle.className='workspace-splitter';handle.dataset.resizeWorkspace=key;handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','horizontal');handle.setAttribute('aria-label',label);handle.title='Drag up / down to resize · Double-click to reset';host.append(handle);
  handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const start=e.clientY,height=host.getBoundingClientRect().height;handle.setPointerCapture(e.pointerId);document.body.classList.add('workspace-resizing');const move=ev=>set(key,height+(ev.clientY-start)*direction);const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);document.body.classList.remove('workspace-resizing');};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);});
  handle.addEventListener('dblclick',()=>{delete values[key];root.style.removeProperty(key==='toolbar'?'--toolbar-height':'--assets-height');});
  handle.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){delete values[key];root.style.removeProperty(key==='toolbar'?'--toolbar-height':'--assets-height');}else set(key,get(key)+(e.key==='ArrowDown'?10:-10)*direction);});
 }
 window.addEventListener('resize',()=>{for(const key of Object.keys(values))set(key,values[key]);});
 const originalReset=windows.reset.bind(windows),save=windows.saveWorkspace.bind(windows),load=windows.loadWorkspace.bind(windows);
 windows.reset=()=>{reset();return originalReset();};
 windows.saveWorkspace=async name=>{await save(name);const layouts=windows.workspaces();layouts[name].compactSizes={...values};localStorage.setItem('senz-workspaces',JSON.stringify(layouts));};
 windows.loadWorkspace=async name=>{const saved=windows.workspaces()[name]?.compactSizes;await load(name);if(saved)for(const key of ['toolbar','assets'])if(Number.isFinite(saved[key]))set(key,saved[key]);};
}
