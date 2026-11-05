// Editor-only guides and scrub zoom. Guides are document metadata, never artwork.
export const scrubZoom=(start,dx)=>Math.max(.02,Math.min(8,start*Math.exp(dx*.008)));
const typing=t=>!!t?.closest?.('input,textarea,select,[contenteditable=true],[data-shortcut]');
const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
export function installCanvasInteractions({editor,actions,windows,guides}){
 const vp=editor.viewport,layer=document.createElement('div');layer.className='canvas-guide-layer';vp.append(layer);
 let zoomMode=false,gesture=null,selected=null,selectedPage=null,frame=0,pending=null;
 const list=()=>Array.isArray(editor.page.guides)?editor.page.guides.filter(g=>g&&typeof g.id==='string'&&['x','y'].includes(g.axis)&&Number.isFinite(g.position)&&Math.abs(g.position)<1e7).slice(0,1000):[];
 const point=e=>{const r=editor.stage.getBoundingClientRect();return {x:(e.clientX-r.left)/editor.zoom,y:(e.clientY-r.top)/editor.zoom};};
 function draw(){
  if(selectedPage!==editor.page){selected=null;selectedPage=editor.page;}
  layer.hidden=!editor.showRulers;layer.replaceChildren();if(layer.hidden)return;
  const gs=list().map(g=>({...g}));if(gesture?.kind==='guide'&&gesture.page===editor.page){const i=gs.findIndex(g=>g.id===gesture.guide.id);if(i<0)gs.push(gesture.guide);else gs[i]=gesture.guide;}
  const left=parseFloat(editor.stage.style.left)||0,top=parseFloat(editor.stage.style.top)||0;
  for(const g of gs){const n=document.createElement('div');n.className='canvas-guide '+(g.axis==='x'?'guide-vertical':'guide-horizontal');n.classList.toggle('selected',g.id===selected);n.dataset.guideId=g.id;n.setAttribute('role','button');n.tabIndex=0;n.setAttribute('aria-label',(g.axis==='x'?'Vertical':'Horizontal')+' guide; drag to move, Delete to remove');n.title='Drag to move · Delete to remove · Drag back to ruler to remove';n.style[g.axis==='x'?'left':'top']=((g.axis==='x'?left:top)+g.position*editor.zoom)+'px';layer.append(n);}
 }
 function mode(on){zoomMode=!!on;vp.classList.toggle('scrub-zoom-mode',zoomMode);document.querySelector('[data-action="zoom-tool"]')?.setAttribute('aria-pressed',String(zoomMode));}
 const selection=actions['selection-tool'];actions['selection-tool']=()=>{finish(false);mode(false);selection?.();};
 actions['zoom-tool']=()=>{if(editor.vectorBusy)return;actions['selection-tool']();mode(true);editor.finishEdit();vp.focus({preventScroll:true});};
 function zoomTo(d,value){
  editor.setZoom(value);
  editor.panX+=d.anchor.x-(parseFloat(editor.stage.style.left)+d.world.x*editor.zoom);
  editor.panY+=d.anchor.y-(parseFloat(editor.stage.style.top)+d.world.y*editor.zoom);
  editor.positionStage();
 }
 function move(e){if(!gesture||e.pointerId!==gesture.id)return;const d=gesture;d.last={x:e.clientX,y:e.clientY};
  if(d.kind==='zoom'){if(Math.abs(e.clientX-d.x)>3)d.moved=true;if(d.moved)zoomTo(d,scrubZoom(d.zoom,e.clientX-d.x));}
  else {d.guide.position=point(e)[d.guide.axis];draw();}
 }
 function finish(save,e){
  if(!gesture)return;if(frame)cancelAnimationFrame(frame);frame=0;if(save&&(e||pending))move(e||pending);pending=null;
  const d=gesture;gesture=null;
  if(vp.hasPointerCapture(d.id))vp.releasePointerCapture(d.id);
  if(d.kind==='zoom'){
   if(save&&!d.moved)zoomTo(d,d.zoom*(d.alt?1/1.2:1.2));
   if(!save){editor.zoom=d.zoom;editor.panX=d.panX;editor.panY=d.panY;editor.zoomMode=d.zoomMode;editor.positionStage();editor.renderSelection();editor.signal('zoom');}
  }else if(save&&editor.page===d.page){
   const r=vp.getBoundingClientRect(),inside=d.last.x>=r.left+24&&d.last.y>=r.top+24&&d.last.x<r.right&&d.last.y<r.bottom;
   const original=list().find(g=>g.id===d.guide.id);
   if((inside&&(!original||original.position!==d.guide.position))||(!inside&&original))editor.applyChange(()=>{const next=list().filter(g=>g.id!==d.guide.id);if(inside)next.push(d.guide);editor.page.guides=next;});
   selected=inside?d.guide.id:null;
  }
  draw();
 }
 function removeGuide(){if(!selected||selectedPage!==editor.page)return false;const id=selected;if(!list().some(g=>g.id===id))return false;selected=null;editor.applyChange(()=>{editor.page.guides=list().filter(g=>g.id!==id);});draw();return true;}
 document.addEventListener('pointerdown',e=>{
  if(gesture||e.button!==0||typing(e.target)||document.querySelector('dialog[open]'))return;
  const ruler=e.target.closest('.canvas-ruler'),line=e.target.closest('.canvas-guide');
  if(vp.contains(e.target)&&(ruler||line||zoomMode)){
   if(editor.drag||editor.vectorBusy)return;
   if(zoomMode&&!ruler){consume(e);editor.finishEdit();const r=vp.getBoundingClientRect();gesture={kind:'zoom',id:e.pointerId,x:e.clientX,zoom:editor.zoom,zoomMode:editor.zoomMode,panX:editor.panX,panY:editor.panY,anchor:{x:e.clientX-r.left,y:e.clientY-r.top},world:point(e),alt:e.altKey,moved:false};}
   else {actions['selection-tool']();const existing=line&&list().find(g=>g.id===line.dataset.guideId);if(!existing&&list().length>=1000)return;consume(e);editor.finishEdit();const axis=ruler?.classList.contains('ruler-top')?'y':'x';const g=existing?{...existing}:{id:crypto.randomUUID(),axis,position:point(e)[axis]};selected=g.id;selectedPage=editor.page;gesture={kind:'guide',id:e.pointerId,page:editor.page,guide:g,last:{x:e.clientX,y:e.clientY}};draw();}
   vp.focus({preventScroll:true});vp.setPointerCapture(e.pointerId);return;
  }
  if(selected){selected=null;draw();}
  if(e.target.closest('.toolrail button,.rail-floating-layer button,[data-action="pan"],[data-action="artboard-tool"]'))mode(false);
 },true);
 document.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;consume(e);pending=e;if(!frame)frame=requestAnimationFrame(()=>{frame=0;const e=pending;pending=null;if(e)move(e);});},true);
 document.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;consume(e);finish(true,e);},true);
 document.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId){consume(e);finish(false);}},true);
 vp.addEventListener('lostpointercapture',e=>{if(gesture?.id===e.pointerId)finish(false);});
 vp.addEventListener('wheel',e=>{if(gesture)consume(e);},{capture:true,passive:false});
 document.addEventListener('keydown',e=>{
  if(typing(e.target)||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Escape'&&(gesture||zoomMode||selected)){consume(e);finish(false);mode(false);selected=null;draw();return;}
  if(['Delete','Backspace'].includes(e.key)&&selected){consume(e);finish(false);removeGuide();}
 },true);
 layer.addEventListener('focusin',e=>{if(e.target.dataset.guideId){selected=e.target.dataset.guideId;selectedPage=editor.page;for(const n of layer.children)n.classList.toggle('selected',n.dataset.guideId===selected);}});
 layer.addEventListener('contextmenu',e=>{consume(e);selected=e.target.closest('[data-guide-id]')?.dataset.guideId||selected;selectedPage=editor.page;removeGuide();});
 window.addEventListener('blur',()=>{finish(false);mode(false);});
 for(const event of ['view','change','selection'])editor.addEventListener(event,draw);
 for(const event of ['document-load','document-activated'])editor.addEventListener(event,()=>{finish(false);selected=null;mode(false);draw();});
 const render=guides.render.bind(guides);guides.render=()=>{render();draw();};
 installQuickFontTitle(windows);draw();return {draw,get zoomMode(){return zoomMode;},get selectedGuide(){return selected;}};
}
export function installQuickFontTitle(windows){
 const tab=document.querySelector('.asset-tabs [data-value="fonts"]');if(!tab||!windows)return;
 tab.classList.add('quick-font-drag-title');tab.title='Quick Font · drag title to move panel';tab.setAttribute('aria-label','Quick Font; drag to move panel');
 let drag=null,suppress=false;
 tab.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;const panel=windows.panels.get('assets');if(!panel)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,panel,moved:false};tab.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();
 });
 tab.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;const d=drag;if(!d.moved){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<5)return;if(d.panel.mode!=='float')windows.float('assets');if(d.panel.mode!=='float'){drag=null;return;}d.rect=d.panel.el.getBoundingClientRect();d.moved=true;tab.setPointerCapture(e.pointerId);}
  d.panel.el.style.left=d.rect.left+e.clientX-d.x+'px';d.panel.el.style.top=d.rect.top+e.clientY-d.y+'px';
 });
 const done=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(d.moved){windows.constrain(d.panel);windows.persist();suppress=true;setTimeout(()=>suppress=false,0);}if(tab.hasPointerCapture(d.id))tab.releasePointerCapture(d.id);};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])tab.addEventListener(event,done);
 tab.addEventListener('click',e=>{if(suppress){consume(e);suppress=false;}},true);
}
