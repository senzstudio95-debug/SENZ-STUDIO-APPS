import {selectionBounds,resizeGroup} from './group-resize.js';
import {measureText} from './editor.js';
import {expandAndUnite} from './vector.js';
import {getVector,vectorKey,cacheVector} from './vector-cache.js';
import {scaleCachedVector} from './vector-cache.js';
export const INCH=96;
export const SIZE_PRESETS=Array.from({length:59},(_,i)=>i+2);
// Use actual ink bounds, excluding the separate box, at 96 design units/inch.
export async function sizedText(original,inches,axis,fonts){
 if(!Number.isFinite(inches)||inches<.01||inches>120)throw Error('Enter a size from 0.01 to 120 inches.');
 if(!['w','h'].includes(axis))throw Error('Choose width or height.');
 if(!original.text.trim())throw Error('Enter text before changing its size.');
 // Resize the completed lettering uniformly, including spacing and thickness.
 // Changing font size alone cannot shrink fixed spacing/outline below its floor.
 const o=structuredClone(original),target=inches*INCH;
 Object.assign(o,measureText(o));
 const v=await expandAndUnite(o,fonts),actual=v.bounds?.[axis];
 if(!(actual>0)||!Number.isFinite(actual))throw Error('This text has no measurable outline.');
 const scale=target/actual;
 o.stretchX=(o.stretchX||1)*scale;o.stretchY=(o.stretchY||1)*scale;
 Object.assign(o,measureText(o));
 cacheVector(o,scaleCachedVector(v,scale,scale));
 return o;
}
export function installSizeTool({panel,editor,fonts,ensureFont,changed,toast}){
 const store='senz-quick-sizes-v1';let slots=[];try{slots=JSON.parse(localStorage.getItem(store)||'[]').filter(s=>s&&Number.isFinite(s.size)&&s.size>=.01&&s.size<=120&&['w','h'].includes(s.axis)).slice(0,32);}catch{}
 panel.innerHTML=`<header class="panel-title"><h2>SIZE TOOL</h2></header><div class="translator-form"><p>Resize selected text, logos and stickers while preserving proportions.</p><label>Apply to<select id="size-scope"><option value="together">Selection together</option><option value="each">Each object</option></select></label><label>Measure<select id="size-axis"><option value="w">Width (in)</option><option value="h">Height (in)</option></select></label><label>Preset size<select id="size-preset"><option value="">Custom</option>${SIZE_PRESETS.map(n=>`<option value="${n}">${n} in</option>`).join('')}</select></label><label>Custom size (in)<input id="size-custom" type="number" min="0.01" max="120" step="0.01" placeholder="e.g. 4.5"></label><div><strong>Quick Size</strong><div id="quick-size-slots" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"></div><button class="soft" data-action="size-quick-add">+ Save size slot</button><small style="display:block;margin-top:6px">Enter a size above, then save it as a shortcut.</small></div><p id="size-status" role="status"></p><p>Single text is measured from visible lettering, excluding its vector box. A combined selection uses its overall bounds. Logos use their object bounds.</p></div>`;
 const $=s=>panel.querySelector(s);let sequence=0,busy=false,timer;
 const selected=()=>editor.selectedObjects.filter(o=>!o.locked&&!o.hidden);
 function drawSlots(){$('#quick-size-slots').innerHTML=slots.map((s,i)=>`<span style="display:flex;gap:2px"><button class="soft" data-action="size-quick-apply" data-value="${i}">${s.axis==='w'?'W':'H'} ${s.size} in</button><button class="soft" data-action="size-quick-remove" data-value="${i}" title="Remove size slot" aria-label="Remove ${s.size} inch slot">×</button></span>`).join('');changed();}
 function persist(next){try{localStorage.setItem(store,JSON.stringify(next));slots=next;drawSlots();}catch{toast('Unable to save quick sizes.',true);}}
 function sync(){const all=selected(),o=all[0];if(busy)return;const axis=$('#size-axis').value,b=all.length>1&&$('#size-scope').value==='together'?selectionBounds(all):o?.type==='text'?getVector(o)?.bounds:o,n=b?.[axis]/INCH;if(document.activeElement!==$('#size-custom')&&o)$('#size-custom').value=Number.isFinite(n)?n.toFixed(3):'';$('#size-preset').value=Number.isFinite(n)&&Math.abs(n-Math.round(n))<.001&&n>=2&&n<=60?String(Math.round(n)):'';$('#size-status').textContent=o?`${all.length} selected object(s).`:'Select text, logos or stickers on canvas.';changed();}
 async function apply(inches){
  editor.finishEdit();const seq=++sequence,objects=selected(),snapshots=objects.map(o=>JSON.stringify(o)),page=editor.page,axis=$('#size-axis').value,scope=$('#size-scope').value;
  if(!objects.length)return;busy=true;$('#size-status').textContent='Resizing…';changed();
  try{
   if(!Number.isFinite(inches)||inches<.01||inches>120)throw Error('Enter a size from 0.01 to 120 inches.');
   const results=[];
   if(scope==='together'&&objects.length>1){const bounds=selectionBounds(objects),k=inches*INCH/bounds[axis];if(!Number.isFinite(k)||k<=0)throw Error('Selection has no measurable size.');const copies=objects.map(o=>({...o}));resizeGroup(copies,objects,bounds,'se',bounds.w*(k-1),bounds.h*(k-1));results.push(...copies);}
   else for(const o of objects){if(o.type==='text'){await ensureFont(o.font);const n=await sizedText(o,inches,axis,fonts);if(o.align==='center')n.x=o.x+(o.w-n.w)/2;else if(o.align==='right')n.x=o.x+o.w-n.w;results.push(n);}else{const k=inches*INCH/o[axis];if(!Number.isFinite(k)||k<=0)throw Error('Object has no measurable size.');results.push({...o,w:o.w*k,h:o.h*k});}if(seq!==sequence)return;}
   if(seq!==sequence||page!==editor.page||objects.some((o,i)=>!editor.selectedObjects.includes(o)||JSON.stringify(o)!==snapshots[i]))return;
   editor.applyChange(()=>objects.forEach((o,i)=>Object.assign(o,results[i])));
  }catch(e){if(seq===sequence)toast(e.message,true);}finally{if(seq===sequence){busy=false;sync();}}
 }
 $('#size-preset').addEventListener('change',e=>{clearTimeout(timer);if(e.target.value){$('#size-custom').value=e.target.value;void apply(Number(e.target.value));}});
 $('#size-custom').addEventListener('input',e=>{clearTimeout(timer);sequence++;if(e.target.value&&e.target.validity.valid){const n=Number(e.target.value);timer=setTimeout(()=>apply(n),120);}});
 for(const id of ['size-axis','size-scope'])$('#'+id).addEventListener('change',sync);
 editor.addEventListener('selection',()=>{sequence++;busy=false;clearTimeout(timer);sync();});editor.addEventListener('change',sync);editor.addEventListener('zoom',sync);drawSlots();sync();
 return {sync,addQuick(){const size=Number($('#size-custom').value),axis=$('#size-axis').value;if(!Number.isFinite(size)||size<.01||size>120)return toast('Enter a size from 0.01 to 120 inches.',true);if(slots.some(s=>s.size===size&&s.axis===axis))return;if(slots.length>=32)return toast('Remove a slot before adding another (32 maximum).',true);persist([...slots,{size,axis}]);},removeQuick(i){persist(slots.filter((s,n)=>n!==Number(i)));},applyQuick(i){const s=slots[Number(i)];if(!s)return;clearTimeout(timer);$('#size-axis').value=s.axis;$('#size-custom').value=s.size;return apply(s.size);}};
}
