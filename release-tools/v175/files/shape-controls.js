// Native shape style: remains editable and uses the existing SVG/export renderer.
export const shapeDefaults={outline:false,strokeWidth:2};
export const shapeControls=`<div class="panel-form shape-outline-controls"><label>Outline (no fill)<input type="checkbox" id="shape-outline"></label><label>Line width (px)<input type="number" id="shape-stroke-width" min="0.1" max="200" step="0.1" value="2"></label></div>`;
export function installShapeControls(editor){
 const panel=document.querySelector('#tool-panel');
 const selected=()=>editor.selectedObjects.filter(o=>o.type==='shape'&&!o.locked);
 function sync(){const toggle=panel.querySelector('#shape-outline'),width=panel.querySelector('#shape-stroke-width');if(!toggle)return;const objects=selected(),style=objects[0]||shapeDefaults;toggle.checked=!!style.outline;toggle.indeterminate=objects.some(o=>!!o.outline!==!!style.outline);if(document.activeElement!==width)width.value=style.strokeWidth||2;}
 panel.addEventListener('change',e=>{
  if(!['shape-outline','shape-stroke-width'].includes(e.target.id))return;
  const key=e.target.id==='shape-outline'?'outline':'strokeWidth';
  const value=key==='outline'?e.target.checked:Number(e.target.value);
  if(key==='strokeWidth'&&(!Number.isFinite(value)||value<.1||value>200)){sync();return;}
  shapeDefaults[key]=value;const objects=selected();if(objects.length)editor.applyChange(()=>objects.forEach(o=>o[key]=value));sync();
 });
 new MutationObserver(sync).observe(panel,{childList:true,subtree:true});
 for(const name of ['selection','change','document-load'])editor.addEventListener(name,sync);
 sync();
}
