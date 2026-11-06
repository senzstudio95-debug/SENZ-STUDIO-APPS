import {uid,PX_MM} from './core.js';
import {visibleBounds} from './object-transform.js';
const frameKeys=['frameEnabled','frameGapX','frameGapY','frameThickness'];
export function selectedBox(editor){
 const chosen=editor.selectedObjects;if(!chosen.length)return null;
 const group=chosen[0].vectorBoxGroup;
 return group&&chosen.every(o=>o.vectorBoxGroup===group)?editor.page.objects.find(o=>o.vectorBoxContainer&&o.vectorBoxGroup===group)||null:null;
}
const isNameText=o=>o.type==='text'&&/[\p{L}\p{N}]/u.test(o.text||'');
const textBatch=editor=>editor.selectedObjects.filter(o=>isNameText(o)&&!o.locked&&!o.hidden).length>1;
// Treat an explicitly linked name and decoration as one design in a batch.
function nameUnits(editor){
 const objects=editor.selectedObjects.filter(o=>!o.vectorBoxContainer&&!o.locked&&!o.hidden),parent=objects.map((_,i)=>i),links=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 objects.forEach((o,i)=>{for(const key of ['groupId','libraryPairId','vectorBoxGroup','vectorBoxName'])if(o[key]){const k=key+':'+o[key];if(links.has(k))parent[root(i)]=root(links.get(k));else links.set(k,i);}});
 const groups=new Map();objects.forEach((o,i)=>{const key=root(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
 return [...groups.values()].flatMap(g=>g.filter(isNameText).length>1?g.map(o=>[o]):[g]);
}
function unitBox(unit,boxes){const key=unit[0]?.vectorBoxGroup;return key&&unit.every(o=>o.vectorBoxGroup===key)?boxes.get(key):null;}
export function boxStyle(editor){
 if(textBatch(editor)){const units=nameUnits(editor),boxes=new Map(editor.page.objects.filter(b=>b.vectorBoxContainer).map(b=>[b.vectorBoxGroup,b]));
 const framed=u=>{const b=unitBox(u,boxes);return b&&u.length>1?b:u.every(o=>o.frameEnabled)?u[0]:null;};
 return {...(framed(units[0])||units[0]?.[0]),frameEnabled:units.every(u=>!!framed(u))};}
 const box=selectedBox(editor);return box?{...box,frameEnabled:true}:editor.selectedObjects.length>1?{...editor.selected,frameEnabled:false}:editor.selected||editor.lastStyle;
}
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
  const units=nameUnits(editor),boxes=new Map(editor.page.objects.filter(b=>b.vectorBoxContainer).map(b=>[b.vectorBoxGroup,b]));
  for(const unit of units){let target=unitBox(unit,boxes);
   if('frameEnabled' in properties){
    if(unit.length>1){const name=unit.find(o=>o.vectorBoxName)?.vectorBoxName||uid();for(const o of unit)o.vectorBoxName=name;}
    for(const o of unit){const old=boxes.get(o.vectorBoxGroup);if(old){o.frameColor ||= old.color||'#000000';for(const k of ['frameGapX','frameGapY','frameThickness'])o[k]=old[k];}o.frameColor ||= o.color||'#000000';delete o.vectorBoxGroup;o.frameEnabled=false;}
    target=null;
    if(properties.frameEnabled&&unit.length>1){const first=unit.find(isNameText)||unit[0],group=uid();target={id:uid(),type:'shape',shape:'rectangle',name:'Vector box',vectorBoxContainer:true,vectorBoxGroup:group,color:first.frameColor,frameGapX:first.frameGapX??.5,frameGapY:first.frameGapY??.5,frameThickness:first.frameThickness??.25,opacity:1,x:0,y:0,w:1,h:1,rotation:0,locked:false,hidden:false};editor.page.objects.push(target);for(const o of unit)o.vectorBoxGroup=group;}
    else for(const o of unit)o.frameEnabled=!!properties.frameEnabled;
   }
   for(const o of target?[target]:unit)for(const k of frameKeys)if(k!=='frameEnabled'&&k in properties)o[k]=properties[k];
  }
  const live=new Set(editor.page.objects.filter(o=>!o.vectorBoxContainer&&o.vectorBoxGroup).map(o=>o.vectorBoxGroup));
  editor.page.objects=editor.page.objects.filter(o=>!o.vectorBoxContainer||live.has(o.vectorBoxGroup));
  const ids=new Set(editor.page.objects.map(o=>o.id));editor.selection=editor.selection.filter(id=>ids.has(id));
  syncVectorBoxes(editor.page);const rest={...properties};for(const k of frameKeys)delete rest[k];return rest;
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
