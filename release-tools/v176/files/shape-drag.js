import {shapeMarkup} from './editor.js';
import {shapeDefaults} from './shape-controls.js';
const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
const typing=t=>t?.closest?.('input,textarea,select,[contenteditable=true]');
export function installShapeDrag({editor,actions,closePanel}){
 const vp=editor.viewport,preview=document.createElementNS('http://www.w3.org/2000/svg','svg');
 preview.classList.add('shape-drag-preview');preview.setAttribute('aria-hidden','true');preview.style.cssText='position:absolute;pointer-events:none;overflow:visible;z-index:6;display:none';vp.append(preview);
 let chosen=null,gesture=null;
 const point=e=>{const r=editor.stage.getBoundingClientRect();return {x:(e.clientX-r.left)/editor.zoom,y:(e.clientY-r.top)/editor.zoom};};
 function cancel(){const g=gesture;gesture=null;preview.style.display='none';if(g&&vp.hasPointerCapture(g.id))vp.releasePointerCapture(g.id);}
 function reset(){cancel();chosen=null;vp.classList.remove('shape-drag-mode');vp.style.cursor='';}
 const select=actions['selection-tool'];actions['selection-tool']=()=>{reset();select();};
 actions['add-shape']=shape=>{
  if(editor.vectorBusy||!['rectangle','rounded','circle','triangle','diamond','line','star','hexagon','pentagon'].includes(shape))return;
  const outline=document.querySelector('#shape-outline'),width=document.querySelector('#shape-stroke-width');
  const style={outline:outline?outline.checked:shapeDefaults.outline,strokeWidth:Number(width?.value)||shapeDefaults.strokeWidth,color:document.querySelector('#object-color').value};
  actions['selection-tool']();chosen={shape,...style};closePanel();vp.classList.add('shape-drag-mode');vp.style.cursor='crosshair';vp.focus({preventScroll:true});
 };
 function object(e){const a=gesture.start,b=point(e);let dx=b.x-a.x,dy=b.y-a.y;
  if(chosen.shape==='line'){let angle=Math.atan2(dy,dx),length=Math.hypot(dx,dy);if(e.shiftKey)angle=Math.round(angle/(Math.PI/4))*Math.PI/4;const h=chosen.strokeWidth;return {...chosen,x:a.x+Math.cos(angle)*length/2-length/2,y:a.y+Math.sin(angle)*length/2-h/2,w:Math.max(.01,length),h,rotation:angle*180/Math.PI};}
  if(e.shiftKey){const size=Math.max(Math.abs(dx),Math.abs(dy));dx=(dx<0?-1:1)*size;dy=(dy<0?-1:1)*size;}
  return {...chosen,x:Math.min(a.x,a.x+dx),y:Math.min(a.y,a.y+dy),w:Math.max(.01,Math.abs(dx)),h:Math.max(.01,Math.abs(dy)),rotation:0};
 }
 function move(e){if(!gesture||e.pointerId!==gesture.id)return;gesture.last=e;const o=object(e),z=editor.zoom;preview.style.display='block';preview.style.left=(parseFloat(editor.stage.style.left)+o.x*z)+'px';preview.style.top=(parseFloat(editor.stage.style.top)+o.y*z)+'px';preview.setAttribute('width',o.w*z);preview.setAttribute('height',o.h*z);preview.setAttribute('viewBox',`0 0 ${o.w} ${o.h}`);preview.style.transform=`rotate(${o.rotation}deg)`;preview.style.transformOrigin='center';preview.innerHTML=shapeMarkup(o);}
 document.addEventListener('pointerdown',e=>{
  if(!chosen||gesture||e.button!==0)return;
  if(!vp.contains(e.target)){if(e.target.closest('button,[data-action]'))reset();return;}
  if(typing(e.target)||e.target.closest('.canvas-ruler,.canvas-guide')||document.querySelector('dialog[open]')||editor.vectorBusy)return;
  consume(e);editor.finishEdit();gesture={id:e.pointerId,start:point(e),screen:{x:e.clientX,y:e.clientY},page:editor.page};vp.focus({preventScroll:true});vp.setPointerCapture(e.pointerId);move(e);
 },true);
 document.addEventListener('pointermove',e=>{if(gesture?.id===e.pointerId){consume(e);move(e);}},true);
 document.addEventListener('pointerup',e=>{if(gesture?.id!==e.pointerId)return;consume(e);const g=gesture,o=object(e),valid=g.page===editor.page&&Math.hypot(e.clientX-g.screen.x,e.clientY-g.screen.y)>=3&&(chosen.shape==='line'||(o.w*editor.zoom>=2&&o.h*editor.zoom>=2));reset();if(valid)editor.add({id:crypto.randomUUID(),type:'shape',...o,opacity:1,locked:false,hidden:false});actions['selection-tool']();},true);
 document.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId){consume(e);reset();}},true);
 vp.addEventListener('lostpointercapture',e=>{if(gesture?.id===e.pointerId)reset();});
 vp.addEventListener('wheel',e=>{if(gesture)consume(e);},{capture:true,passive:false});
 document.addEventListener('keydown',e=>{if(!chosen||typing(e.target))return;if(e.key==='Escape'){consume(e);actions['selection-tool']();}else if(gesture&&(e.ctrlKey||e.metaKey)){cancel();}else if(['p','e','v','z'].includes(e.key.toLowerCase()))reset();},true);
 for(const name of ['document-load','document-activated','change'])editor.addEventListener(name,()=>{if(gesture)reset();});
 window.addEventListener('blur',reset);
}
