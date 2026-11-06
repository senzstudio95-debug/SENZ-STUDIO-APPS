const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve('payload/resources/app/dist');
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf'};
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(file===path.join(root,'app.js'))data=Buffer.concat([data,Buffer.from('\nwindow.__senzTest={get editor(){return editor},get actions(){return actions},get windows(){return windows}};\n')]);res.end(data);});});
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(20000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('ui-artifacts',{recursive:true});
 try{
  await p.goto('http://127.0.0.1:8765');await p.waitForFunction(()=>window.__senzTest?.editor&&document.querySelector('.canvas-guide-layer')&&document.querySelector('.quick-font .qmini-handle'),null,{timeout:90000});
  await p.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  await p.locator('#viewport').focus();
  const rect=await p.locator('#viewport').boundingBox(),cx=rect.x+rect.width*.55,cy=rect.y+rect.height*.48;
  const state=()=>p.evaluate(()=>({zoom:__senzTest.editor.zoom,project:JSON.stringify(__senzTest.editor.project),guides:__senzTest.editor.page.guides||[],objects:__senzTest.editor.page.objects.length}));
  let before=await state();await p.keyboard.press('z');assert(await p.locator('#viewport').evaluate(e=>e.classList.contains('scrub-zoom-mode')),'Z activates zoom');
  const world=await p.evaluate(({cx,cy})=>{const e=__senzTest.editor,r=e.stage.getBoundingClientRect();return {x:(cx-r.left)/e.zoom,y:(cy-r.top)/e.zoom};},{cx,cy});
  await p.mouse.move(cx,cy);await p.mouse.down();await p.mouse.move(cx+90,cy,{steps:12});await p.mouse.up();let after=await state();assert(after.zoom>before.zoom,'Right drag zooms in');assert.equal(after.project,before.project,'Zoom must not change artwork');
  const anchored=await p.evaluate(({cx,cy})=>{const e=__senzTest.editor,r=e.stage.getBoundingClientRect();return {x:(cx-r.left)/e.zoom,y:(cy-r.top)/e.zoom};},{cx,cy});assert(Math.abs(world.x-anchored.x)<.05&&Math.abs(world.y-anchored.y)<.05,'Zoom stays anchored to initial pointer');
  assert(!await p.locator('#viewport').evaluate(e=>e.classList.contains('scrub-zoom-mode')),'Release returns to Move');before=after;await p.keyboard.press('z');await p.mouse.move(cx,cy);await p.mouse.down();await p.mouse.move(cx-90,cy,{steps:12});await p.mouse.up();after=await state();assert(after.zoom<before.zoom,'Left drag zooms out');
  await p.keyboard.press('Escape');assert(!await p.locator('#viewport').evaluate(e=>e.classList.contains('scrub-zoom-mode')));
  // Typing z in a text field must remain typing.
  await p.locator('#asset-search').fill('');await p.locator('#asset-search').press('z');assert.equal(await p.locator('#asset-search').inputValue(),'z');assert(!await p.locator('#viewport').evaluate(e=>e.classList.contains('scrub-zoom-mode')));await p.locator('#asset-search').fill('');
  const drag=async(x,y,toX,toY)=>{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(toX,toY,{steps:12});await p.mouse.up();};
  await drag(cx,rect.y+12,cx,cy);after=await state();assert.equal(after.guides.length,1);assert.equal(after.guides[0].axis,'y');
  const original=after.guides[0].position;
  await drag(rect.x+75,cy,rect.x+75,cy+35);after=await state();assert(after.guides[0].position>original,'Guide can move');
  const count=after.objects;await p.keyboard.press('Delete');after=await state();assert.equal(after.guides.length,0);assert.equal(after.objects,count,'Deleting guide preserves artwork');
  await p.keyboard.press('Control+z');assert.equal((await state()).guides.length,1,'Ctrl+Z still undoes guide deletion');await p.keyboard.press('Control+Shift+z');assert.equal((await state()).guides.length,0);
  const rulerStart=await p.evaluate(()=>{const r=document.querySelector('.ruler-left').getBoundingClientRect();for(let y=r.top+28;y<r.bottom-5;y+=5){const x=r.left+12;if(document.elementFromPoint(x,y)?.closest('.ruler-left'))return {x,y};}return null;});assert(rulerStart,'Left ruler must have an exposed drag area');await drag(rulerStart.x,rulerStart.y,cx,cy);assert.equal((await state()).guides[0].axis,'x');
  // Cancelling a move restores the original guide position.
  before=await state();await p.mouse.move(cx,rect.y+80);await p.mouse.down();await p.mouse.move(cx+30,rect.y+80);await p.keyboard.press('Escape');await p.mouse.up();assert.equal((await state()).guides[0].position,before.guides[0].position);
  await drag(cx,rect.y+80,rect.x+12,rect.y+80);assert.equal((await state()).guides.length,0,'Dragging back to ruler removes guide');
  await drag(cx,rect.y+12,cx,cy);
  const saved=await p.evaluate(()=>JSON.parse(JSON.stringify(__senzTest.editor.project)));
  await p.evaluate(async project=>{const {packProject,unpackProject}=await import('/project-storage.js');const e=__senzTest.editor;e.load(unpackProject(packProject(project)));},{...saved});assert.equal((await state()).guides.length,1,'Guide survives save/load');
  assert.equal(await p.locator('#canvas .canvas-guide').count(),0,'Guides never enter export SVG');
  await p.evaluate(()=>__senzTest.editor.addPage());assert.equal(await p.locator('.canvas-guide').count(),0,'Guides are per-page');await p.evaluate(()=>__senzTest.editor.changePage(0));assert.equal(await p.locator('.canvas-guide').count(),1);
  // Quick Font title detaches and moves the existing panel without altering document data.
  before=await state();const title=p.locator('.asset-tabs [data-value="fonts"]'),tr=await title.boundingBox();await drag(tr.x+tr.width/2,tr.y+tr.height/2,tr.x+tr.width/2+90,tr.y+tr.height/2-130);
  assert.equal(await p.evaluate(()=>__senzTest.windows.panels.get('assets').mode),'float');assert.equal((await state()).project,before.project);
  const oldRect=await p.locator('.asset-dock').boundingBox(),tt=await title.boundingBox();await drag(tt.x+tt.width/2,tt.y+tt.height/2,tt.x+tt.width/2+70,tt.y+tt.height/2-35);const newRect=await p.locator('.asset-dock').boundingBox();assert(Math.abs(oldRect.x-newRect.x)>10||Math.abs(oldRect.y-newRect.y)>10,'Quick Font title moves floating panel');
  assert.equal(await p.locator('.quick-font .qmini-handle').innerText(),'Quick Font');
  await runNewChecks(p,assert);
  await p.screenshot({path:'ui-artifacts/canvas-tools.png'});
  assert(!errors.some(e=>/canvas-interactions/.test(e)),errors.join('\n'));
  console.log('PASS: Z scrub zoom, anchor, typing, Escape, guide create/move/delete/undo/cancel/save/pages/export isolation, Quick Font title drag.');
 }catch(e){await p.screenshot({path:'ui-artifacts/failure.png'});console.error('Page errors:',errors);throw e;}finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
async function runNewChecks(p,assert){
 await p.evaluate(()=>{const e=__senzTest.editor;e.select([]);__senzTest.actions.tool('shape');});
 await p.locator('#shape-outline').check();await p.locator('#shape-stroke-width').fill('4');await p.locator('#shape-stroke-width').press('Tab');
 await p.locator('[data-action="add-shape"][data-value="rectangle"]').click();
 let shape=await p.evaluate(()=>JSON.parse(JSON.stringify(__senzTest.editor.selected)));assert.equal(shape.type,'shape');assert.equal(shape.outline,true);assert.equal(shape.strokeWidth,4);
 const markup=await p.evaluate(async()=>{const {shapeMarkup}=await import('/editor.js');return shapeMarkup(__senzTest.editor.selected);});assert(markup.includes('fill="none"')&&markup.includes('stroke-width="4"'),'Shape rendering is outline');
 await p.evaluate(()=>__senzTest.actions.tool('shape'));await p.locator('#shape-outline').uncheck();assert.equal(await p.evaluate(()=>__senzTest.editor.selected.outline),false);
 await p.evaluate(()=>__senzTest.actions.undo());assert.equal(await p.evaluate(id=>__senzTest.editor.page.objects.find(o=>o.id===id).outline,shape.id),true,'Undo restores outline');
 await p.evaluate(()=>__senzTest.actions.redo());assert.equal(await p.evaluate(id=>__senzTest.editor.page.objects.find(o=>o.id===id).outline,shape.id),false);await p.evaluate(id=>__senzTest.editor.select(id),shape.id);
 await p.locator('#shape-outline').check();
 await p.evaluate(()=>__senzTest.actions['close-tool']());
 // Release zoom and immediately move the selected shape with no V/Escape.
 await p.evaluate(()=>__senzTest.editor.fit());let box=await p.locator(`[data-object="${shape.id}"]`).boundingBox();let x=box.x+box.width/2,y=box.y+box.height/2;
 await p.locator('#viewport').focus();await p.keyboard.press('z');await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+25,y,{steps:5});await p.mouse.up();
 assert(!await p.locator('#viewport').evaluate(e=>e.classList.contains('scrub-zoom-mode')));
 box=await p.locator(`[data-object="${shape.id}"]`).boundingBox();x=box.x+box.width/2;y=box.y+box.height/2;
 const before=await p.evaluate(()=>__senzTest.editor.selected.x);await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+30,y+10,{steps:5});await p.mouse.up();assert((await p.evaluate(()=>__senzTest.editor.selected.x))>before,'Move works immediately after zoom');
 const selectors=['.buddy-toggle','.namae-toggle','.signature-toggle','.remover-toggle','.remote-toggle','.senz-store-toggle'];
 const desktop=await p.evaluate(ss=>ss.map(s=>[...document.querySelectorAll('.mode-dock '+s)].map(e=>getComputedStyle(e).display)),selectors);
 await p.evaluate(()=>document.querySelector('[data-focus-mode="focus"]').click());await p.waitForFunction(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 for(const s of selectors){assert.equal(await p.locator('.focus-quick '+s).count(),1);assert.equal(await p.locator('.focus-quick '+s).evaluate(e=>getComputedStyle(e).display),'none');}
 assert(await p.locator('.focus-quick [data-action="undo"]').isVisible(),'Focus Undo remains');
 await p.screenshot({path:'ui-artifacts/focus-mode.png'});
 await p.evaluate(()=>document.querySelector('.focus-bottom [data-focus-mode="desktop"]').click());await p.waitForFunction(()=>!document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 assert.deepEqual(await p.evaluate(ss=>ss.map(s=>[...document.querySelectorAll('.mode-dock '+s)].map(e=>getComputedStyle(e).display)),selectors),desktop,'Desktop shortcuts unchanged');
 console.log('PASS: automatic Move after zoom with real drag; shape outline creation/edit/width/render/undo/redo; six Focus shortcuts hidden and Desktop preserved.');
}
