import {uid,PX_MM} from './core.js';
import {visibleBounds} from './object-transform.js';
const frameKeys=['frameEnabled','frameGapX','frameGapY','frameThickness'];
export function selectedBox(editor){
 const chosen=editor.selectedObjects;if(!chosen.length)return null;
 const group=chosen[0].vectorBoxGroup;
 return group&&chosen.every(o=>o.vectorBoxGroup===group)?editor.page.objects.find(o=>o.vectorBoxContainer&&o.vectorBoxGroup===group)||null:null;
}
const textBatch=editor=>editor.selectedObjects.filter(o=>o.type==='text'&&!o.locked&&!o.hidden).length>1;
export function boxStyle(editor){if(textBatch(editor)){const objects=editor.selectedObjects.filter(o=>!o.vectorBoxContainer&&!o.locked&&!o.hidden);return {...objects[0],frameEnabled:objects.every(o=>o.frameEnabled)};}const box=selectedBox(editor);return box?{...box,frameEnabled:true}:editor.selectedObjects.length>1?{...editor.selected,frameEnabled:false}:editor.selected||editor.lastStyle;}
export function syncVectorBoxes(page){
 const groups=new Map();for(const o of page.objects)if(o.vectorBoxGroup&&!o.vectorBoxContainer&&!o.hidden){if(!groups.has(o.vectorBoxGroup))groups.set(o.vectorBoxGroup,[]);groups.get(o.vectorBoxGroup).push(o);}
 for(const box of page.objects.filter(o=>o.vectorBoxContainer)){
  const members=groups.get(box.vectorBoxGroup)||[];
  if(!members.length){box.hidden=true;continue;}box.hidden=false;
  const points=members.flatMap(o=>{const b=visibleBounds({...o,frameEnabled:false}),a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(([x,y])=>({x:o.x+o.w/2+(x-o.w/2)*c-(y-o.h/2)*s,y:o.y+o.h/2+(x-o.w/2)*s+(y-o.h/2)*c}));});
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),r=Math.max(...points.map(p=>p.x)),b=Math.max(...points.map(p=>p.y));
  const t=Math.max(.05,Number(box.frameThickness??.25))*PX_MM,gx=Math.max(0,Number(box.frameGapX??.5))*PX_MM+t,gy=Math.max(0,Number(box.frameGapY??.5))*PX_MM+t;
  Object.assign(box,{x:x-gx,y:y-gy,w:r-x+2*gx,h:b-y+2*gy,rotation:0,flipX:false,flipY:false,strokeWidth:t,outline:true,frameEnabled:false});
 }
 return page.objects.filter(o=>o.vectorBoxContainer);
}
export function updateVectorBox(editor,properties){
 if(!frameKeys.some(k=>k in properties))return properties;
 const selected=editor.selectedObjects,objects=selected.filter(o=>!o.vectorBoxContainer&&!o.locked&&!o.hidden);let box=selectedBox(editor);
 if(textBatch(editor)){
  // A batch of names is a batch of individual frames, never one canvas-wide frame.
  if('frameEnabled' in properties){
   for(const o of objects){const old=editor.page.objects.find(b=>b.vectorBoxContainer&&b.vectorBoxGroup===o.vectorBoxGroup);if(old){o.frameColor ||= old.color||'#000000';for(const k of ['frameGapX','frameGapY','frameThickness'])o[k]=old[k];}delete o.vectorBoxGroup;}
   const live=new Set(editor.page.objects.filter(o=>!o.vectorBoxContainer&&o.vectorBoxGroup).map(o=>o.vectorBoxGroup));
   editor.page.objects=editor.page.objects.filter(o=>!o.vectorBoxContainer||live.has(o.vectorBoxGroup));
   const ids=new Set(editor.page.objects.map(o=>o.id));editor.selection=editor.selection.filter(id=>ids.has(id));
  }
  return properties;
 }
 if(selected.some(o=>o.locked))return properties;
 if(!box&&objects.length<2)return properties;
 if(properties.frameEnabled===false){
  for(const o of objects)o.frameEnabled=false;
  if(box){editor.page.objects=editor.page.objects.filter(o=>o!==box);for(const o of editor.page.objects)if(o.vectorBoxGroup===box.vectorBoxGroup){delete o.vectorBoxGroup;o.frameEnabled=false;}}
 }else{
  if(!box){const first=objects[0],group=uid();box={id:uid(),type:'shape',shape:'rectangle',name:'Vector box',vectorBoxContainer:true,vectorBoxGroup:group,color:first.frameColor||first.color||'#000000',frameGapX:first.frameGapX??.5,frameGapY:first.frameGapY??.5,frameThickness:first.frameThickness??.25,opacity:1,x:0,y:0,w:1,h:1,rotation:0,locked:false,hidden:false};editor.page.objects.push(box);for(const o of objects){o.frameEnabled=false;o.vectorBoxGroup=group;}}
  for(const k of frameKeys)if(k!=='frameEnabled'&&k in properties)box[k]=properties[k];
 }
 syncVectorBoxes(editor.page);const rest={...properties};for(const k of frameKeys)delete rest[k];return rest;
}
export function detachSharedBoxes(editor){const box=selectedBox(editor);if(!box)return false;editor.applyChange(()=>{for(const o of editor.page.objects)if(o.vectorBoxGroup===box.vectorBoxGroup)delete o.vectorBoxGroup;delete box.vectorBoxContainer;editor.selection=[box.id];});return true;}
