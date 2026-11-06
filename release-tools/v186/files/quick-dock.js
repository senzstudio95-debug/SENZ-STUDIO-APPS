import {quickChevron} from './quick-chevron.js';
// Collapse the bottom font dock without closing its PanelManager window.
export function installQuickDock(){
 const dock=document.querySelector('.asset-dock');if(!dock)return;
 const arrow=document.createElement('button');arrow.type='button';arrow.className='quick-dock-toggle';arrow.setAttribute('aria-label','Hide Quick Font');arrow.innerHTML=quickChevron;dock.append(arrow);
 let collapsed=false,animation=null,saved=null;
 const keys=['height','min-height','max-height','flex-basis','padding-top','padding-bottom'];
 const restore=()=>{if(saved)for(const [key,value,priority] of saved)value?dock.style.setProperty(key,value,priority):dock.style.removeProperty(key);};
 function set(next,animate=true){
  if(animation)cancelAnimationFrame(animation);animation=null;const before=dock.getBoundingClientRect().height;
  if(!collapsed&&next&&!saved)saved=keys.map(k=>[k,dock.style.getPropertyValue(k),dock.style.getPropertyPriority(k)]);
  restore();collapsed=next;dock.classList.toggle('quick-dock-collapsed',next);
  if(next){for(const key of keys)dock.style.setProperty(key,key.startsWith('padding')?'0px':'24px','important');}
  arrow.classList.toggle('is-collapsed',next);arrow.title=next?'Show Quick Font':'Hide Quick Font';arrow.setAttribute('aria-label',arrow.title);arrow.setAttribute('aria-expanded',String(!next));
  for(const child of dock.children)if(child!==arrow)child.inert=next;
  try{localStorage.setItem('senz-quick-dock-hidden',String(next));}catch{}
  const after=dock.getBoundingClientRect().height;
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   // Animate the height alongside the slide, leaving the arrow reachable throughout.
   const started=performance.now();const tick=now=>{const t=Math.min(1,(now-started)/380),ease=1-Math.pow(1-t,3),height=before+(after-before)*ease;for(const key of keys.slice(0,4))dock.style.setProperty(key,height+'px','important');if(t<1)animation=requestAnimationFrame(tick);else{animation=null;if(!collapsed){restore();saved=null;}}};animation=requestAnimationFrame(tick);

   for(const child of dock.children)if(child!==arrow&&!child.classList.contains('workspace-splitter'))child.animate(next?[{opacity:1},{opacity:0}]:[{opacity:0},{opacity:1}],{duration:180,easing:'linear'});
  }
 }
 arrow.onclick=e=>{e.stopPropagation();set(!collapsed);};
 // Opening the existing Quick Font app restores the bottom dock as well.
 window.addEventListener('senz-open-quick-dock',()=>set(false));
 try{if(localStorage.getItem('senz-quick-dock-hidden')==='true')set(true,false);}catch{}
}
