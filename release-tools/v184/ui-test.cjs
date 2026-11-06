const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve('payload/resources/app/dist');
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf'};
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(file===path.join(root,'app.js'))data=Buffer.concat([data,Buffer.from('\nwindow.__senzTest={get editor(){return editor},get actions(){return actions},get windows(){return windows},get fonts(){return fonts}};\n')]);res.end(data);});});
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
  await runNewChecks(p,assert);await checkShapeDrag(p,assert);await checkTextSizing(p,assert);await checkAutoArrange(p,assert);await checkArrange184(p,assert);await checkVectorBoxes(p,assert);await checkSharedBox(p,assert);await checkDenseArrange(p,assert);await checkIndividualTextBoxes(p,assert);await checkNameEmojiBoxes(p,assert);
  await p.screenshot({path:'ui-artifacts/canvas-tools.png'});
  assert(!errors.some(e=>/canvas-interactions/.test(e)),errors.join('\n'));
  console.log('PASS: Z scrub zoom, anchor, typing, Escape, guide create/move/delete/undo/cancel/save/pages/export isolation, Quick Font title drag.');
 }catch(e){await p.screenshot({path:'ui-artifacts/failure.png'});console.error('Page errors:',errors);throw e;}finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
async function runNewChecks(p,assert){
 await p.evaluate(()=>__senzTest.windows.dock('assets'));
 await p.evaluate(()=>{const e=__senzTest.editor;e.select([]);__senzTest.actions.tool('shape');});
 await p.locator('#shape-outline').check();await p.locator('#shape-stroke-width').fill('4');await p.locator('#shape-stroke-width').press('Tab');
 await p.locator('[data-action="add-shape"][data-value="rectangle"]').click();
 const r=await p.locator('#viewport').boundingBox();const count=await p.evaluate(()=>__senzTest.editor.page.objects.length);await p.mouse.move(r.x+r.width*.55,r.y+r.height*.45);await p.mouse.down();await p.mouse.move(r.x+r.width*.55+100,r.y+r.height*.45+70,{steps:8});assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.length),count,'Preview is not committed');await p.mouse.up();assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.length),count+1);
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
async function checkShapeDrag(p,assert){
 await p.evaluate(()=>{__senzTest.actions['close-tool']();__senzTest.editor.fit();});
 const r=await p.locator('#viewport').boundingBox(),x=r.x+r.width*.6,y=r.y+r.height*.5;
 const count=()=>p.evaluate(()=>__senzTest.editor.page.objects.length);
 const arm=shape=>p.evaluate(shape=>__senzTest.actions['add-shape'](shape),shape);
 const drag=async(dx,dy)=>{await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx,y+dy,{steps:6});await p.mouse.up();};
 for(const shape of ['rectangle','rounded','circle','triangle','diamond','line','star','hexagon','pentagon']){
  const before=await count();await arm(shape);assert.equal(await count(),before,'Picking shape creates nothing');await drag(-90,-60);assert.equal(await count(),before+1);
  const o=await p.evaluate(()=>__senzTest.editor.selected);assert.equal(o.shape,shape);assert(o.w>0&&o.h>0);assert(!await p.locator('#viewport').evaluate(e=>e.classList.contains('shape-drag-mode')));
  await p.evaluate(()=>__senzTest.actions.undo());assert.equal(await count(),before,'One undo removes new shape');await p.evaluate(()=>__senzTest.actions.redo());assert.equal(await count(),before+1);
 }
 await arm('circle');await p.keyboard.down('Shift');await drag(90,40);await p.keyboard.up('Shift');const o=await p.evaluate(()=>__senzTest.editor.selected);assert(Math.abs(o.w-o.h)<.01,'Shift circle stays round');
 let before=await count();await arm('rectangle');await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+70,y+60);await p.keyboard.press('Escape');await p.mouse.up();assert.equal(await count(),before,'Esc discards preview');
 await arm('rectangle');await p.mouse.click(x,y);assert.equal(await count(),before,'Click without drag makes no tiny shape');
 await arm('star');await p.keyboard.press('z');assert(!await p.locator('#viewport').evaluate(e=>e.classList.contains('shape-drag-mode')));await drag(40,0);assert.equal(await count(),before,'Switching to zoom does not create shape');
 assert.equal(await p.locator('#canvas .shape-drag-preview').count(),0,'Preview cannot be exported');
 console.log('PASS: all nine shapes draw in reverse direction, Shift circle, cancel, no accidental click shape, tool switch, single undo/redo and preview isolation.');
}
async function checkTextSizing(p,assert){
 const results=await p.evaluate(async()=>{
  const {sizedText}=await import('/size-tool.js'),{makeText}=await import('/core.js'),{measureText}=await import('/editor.js'),{expandAndUnite}=await import('/vector.js'),{getVector}=await import('/vector-cache.js');
  const fonts=__senzTest.fonts,e=__senzTest.editor;
  const sample=makeText('SENZ STUDIO');sample.font='Poppins';sample.size=72;sample.textWeight=10;sample.letterSpacing=25;sample.wordSpacing=30;Object.assign(sample,measureText(sample));
  const original=JSON.stringify(sample),checks=[];let current=sample;
  for(const [axis,size] of [['w',.1],['w',2],['h',.1],['w',60],['w',1],['h',2]]){
   const result=await sizedText(current,size,axis,fonts),v=getVector(result);if(Math.abs(v.bounds[axis]-size*96)>.02)throw Error('Wrong resized bounds');
   const ratioBefore=(await expandAndUnite(current,fonts)).bounds; if(Math.abs(v.bounds.w/v.bounds.h-ratioBefore.w/ratioBefore.h)>1e-6)throw Error('Distorted proportions');
   // A different alignment invalidates the cache: verify editable fields rebuild the same ink size.
   const copy=JSON.parse(JSON.stringify(result));copy.align=copy.align==='right'?'left':'right';Object.assign(copy,measureText(copy));const rebuilt=await expandAndUnite(copy,fonts);if(Math.abs(rebuilt.bounds[axis]-size*96)>.03)throw Error('Rebuilt text differs from cached size');
   current=result;checks.push([axis,size,v.bounds[axis]]);
  }
  if(JSON.stringify(sample)!==original)throw Error('Input text mutated');
  for(const text of ['Small text','Two\nLines']){const o={...sample,text,textWeight:0,letterSpacing:0,wordSpacing:0};const n=await sizedText(o,3,'w',fonts);if(Math.abs(getVector(n).bounds.w-288)>.02)throw Error('Plain text resize failed');}
  const rich={...sample,text:'SENZ STUDIO',runs:[{start:0,end:5,font:'Poppins',size:72},{start:5,end:11,font:'Poppins',size:48}]};const n=await sizedText(rich,2,'w',fonts);if(Math.abs(getVector(n).bounds.w-192)>.02)throw Error('Rich text failed');
  e.add(sample);return checks;
 });console.log('PASS: thick/spaced text shrinks, repeat width/height resize, proportions, regeneration, unchanged source, plain and multiline/rich text',results);
 await p.evaluate(()=>{__senzTest.actions['size-tool']();});await p.locator('#size-scope').selectOption('each');await p.locator('#size-axis').selectOption('w');await p.locator('#size-custom').fill('0.1');
 await p.waitForFunction(async()=>{const {getVector}=await import('/vector-cache.js');return Math.abs((getVector(__senzTest.editor.selected)?.bounds.w||0)-9.6)<.02;});
 await p.evaluate(()=>__senzTest.actions.undo());await p.evaluate(()=>__senzTest.actions.redo());
 await p.evaluate(()=>{const e=__senzTest.editor;e.select(e.page.objects.at(-1).id);__senzTest.windows.close('size');document.querySelector('[data-focus-mode="focus"]').click();});
 await p.waitForFunction(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 await p.locator('#focus-size').selectOption('1');await p.waitForFunction(async()=>{const {getVector}=await import('/vector-cache.js');return Math.abs((getVector(__senzTest.editor.selected)?.bounds.w||0)-96)<.02;});
 await p.screenshot({path:'ui-artifacts/text-resize-focus.png'});console.log('PASS: real Size Tool and Focus size controls resize thick/spaced text');
}

async function checkAutoArrange(p,assert){
 await p.evaluate(()=>document.querySelector('.focus-bottom [data-focus-mode="desktop"]').click());await p.waitForFunction(()=>!document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 await p.evaluate(async()=>{const {makeText}=await import('/core.js'),{measureText}=await import('/editor.js'),{expandAndUnite}=await import('/vector.js');const e=__senzTest.editor;e.addPage();e.resizeCanvas(300,200);const objects=[];for(let i=0;i<9;i++){const o=makeText('SENZ '+i,10+i*5,10+i*10,{font:'Poppins',size:20,color:['#ff0000','#000000','#0000ff'][i%3]});Object.assign(o,measureText(o));await expandAndUnite(o,__senzTest.fonts);objects.push(o);}e.applyChange(()=>e.page.objects=objects);e.select([]);e.fit();__senzTest.actions['library-arrange']();});
 assert(await p.locator('.auto-arrange-window').isVisible());await p.locator('#aa-layout').selectOption('compact');await p.locator('#aa-width').fill('11.023622');await p.locator('#aa-width').press('Tab');await p.locator('#aa-height').fill('7.086614');await p.locator('#aa-height').press('Tab');
 const original=await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects));await p.locator('#aa-separate').check();await p.locator('[data-aa="preview"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Preview:'));assert.equal(await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects)),original,'Preview must not mutate objects');
 await p.screenshot({path:'ui-artifacts/auto-arrange-preview.png'});await p.locator('[data-aa="apply"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Arranged:'));
 const result=await p.evaluate(async()=>{const {inkBounds}=await import('/auto-arrange.js'),e=__senzTest.editor;return {box:e.page.arrangeBox,objects:e.page.objects.map(o=>({id:o.id,color:o.color,b:inkBounds(o)}))};});
 const mm=96/25.4;for(const o of result.objects){assert(o.b.x>=result.box.x+2*mm-.01);assert(o.b.y>=result.box.y+2*mm-.01);assert(o.b.x+o.b.w<=result.box.x+result.box.w-2*mm+.01);assert(o.b.y+o.b.h<=result.box.y+result.box.h-2*mm+.01);}
 assert.equal(new Set(result.objects.map(o=>o.b.y.toFixed(3))).size,3,'Three color rows');await p.evaluate(()=>__senzTest.actions.undo());assert.equal(await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects)),original,'One Undo restores positions');
 await p.locator('#aa-width').fill('0.19685');await p.locator('#aa-width').press('Tab');await p.locator('[data-aa="apply"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').classList.contains('error'));assert.equal(await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects)),original,'Overflow moves nothing');
 await p.locator('[data-aa="draw"]').click();const r=await p.locator('#viewport').boundingBox(),x=r.x+r.width*.3,y=r.y+r.height*.3;await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+220,y+150,{steps:8});await p.mouse.up();assert(await p.locator('.auto-arrange-window').isVisible());const drawn=await p.evaluate(()=>({...__senzTest.editor.page.arrangeBox}));assert(drawn.w>0&&drawn.h>0);
 await p.locator('[data-aa="edit"]').click();const b=await p.locator('.arrange-box').boundingBox();await p.mouse.move(b.x+20,b.y+1);await p.mouse.down();await p.mouse.move(b.x+55,b.y+26,{steps:6});await p.mouse.up();const moved=await p.evaluate(()=>({...__senzTest.editor.page.arrangeBox}));assert(moved.x>drawn.x&&moved.y>drawn.y,'Box moves');
 await p.locator('[data-aa="edit"]').click();const handle=await p.locator('.aa-resize').boundingBox();await p.mouse.move(handle.x+7,handle.y+7);await p.mouse.down();await p.mouse.move(handle.x+47,handle.y+37,{steps:6});await p.mouse.up();assert((await p.evaluate(()=>__senzTest.editor.page.arrangeBox.w))>moved.w,'Box resizes');
 await p.locator('[data-aa="draw"]').click();await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+40,y+40);await p.keyboard.press('Escape');await p.mouse.up();assert(await p.locator('.auto-arrange-window').isVisible());
 assert.equal(await p.locator('#canvas .arrange-box').count(),0,'Box never enters artwork SVG');
 await p.locator('[data-aa="close"]').first().click();const saved=await p.evaluate(()=>JSON.parse(JSON.stringify(__senzTest.editor.project)));await p.evaluate(async project=>{const {packProject,unpackProject}=await import('/project-storage.js');__senzTest.editor.load(unpackProject(packProject(project)));},saved);assert(await p.evaluate(()=>__senzTest.editor.project.pages.some(p=>p.arrangeBox)),'Box survives save/load');
 console.log('PASS: arrange preview, real color rows, containment, undo, overflow safety, drawing/moving/resizing/cancelling box, save/load and export isolation.');
}
async function checkArrange184(p,assert){
 await p.evaluate(()=>{const e=__senzTest.editor;e.addPage();e.resizeCanvas(300,200);e.add({id:'mixed-shape',type:'shape',shape:'rectangle',x:30,y:30,w:50,h:40,rotation:0,color:'#00ff00'});e.add({id:'mixed-image',type:'image',src:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="blue"/></svg>'),x:90,y:80,w:30,h:30,rotation:0});e.select([]);e.fit();__senzTest.actions['auto-arrange']();});
 assert.equal(await p.locator('#aa-scope').inputValue(),'all');assert(Math.abs(Number(await p.locator('#aa-gap-x').inputValue())*25.4-4)<.001);assert((await p.locator('.aa-dimensions').innerText()).includes('in'));
 await p.locator('#aa-width').fill('10');await p.locator('#aa-width').press('Tab');await p.locator('#aa-height').fill('6');await p.locator('#aa-height').press('Tab');assert.equal(await p.evaluate(()=>__senzTest.editor.page.arrangeBox.w),960);
 await p.locator('#aa-separate').uncheck();
 const win=p.locator('.auto-arrange-window'),old=await win.boundingBox(),header=await p.locator('.aa-header').boundingBox();await p.mouse.move(header.x+150,header.y+35);await p.mouse.down();await p.mouse.move(header.x+220,header.y+50,{steps:5});await p.mouse.up();const moved=await win.boundingBox();assert(moved.x-old.x>50&&moved.y-old.y>5,'Window title drags');
 await p.locator('[data-aa="apply"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Arranged:'));assert((await p.locator('.aa-status').innerText()).includes('2 objects'),'All includes shape and image');
 const objects=await p.evaluate(()=>__senzTest.editor.page.objects);const a=objects.find(o=>o.id==='mixed-shape'),b=objects.find(o=>o.id==='mixed-image');assert(Math.abs(b.x-(a.x+a.w)-4*96/25.4)<.001,'Exact default 4mm gap');
 await p.evaluate(()=>__senzTest.editor.select('mixed-shape'));assert.equal(await p.locator('#aa-scope').inputValue(),'selected');assert.equal(await p.locator('[data-aa-color]').count(),1);assert((await p.locator('.aa-colors').innerText()).includes('#00ff00'),'Selection auto detects color');
 await p.locator('#aa-scope').selectOption('all');await p.locator('#aa-width').fill('10.5');await p.locator('#aa-width').press('Tab');assert.equal(await p.locator('#aa-scope').inputValue(),'all','Box edits preserve chosen scope');const before=await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects.find(o=>o.id==='mixed-image')));await p.locator('[data-aa-only-color="0"]').click();await p.locator('#aa-gap-x').fill('0.25');await p.locator('#aa-gap-x').press('Tab');await p.locator('[data-aa="apply"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Arranged:'));assert.equal(await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects.find(o=>o.id==='mixed-image'))),before,'Other colors untouched');assert((await p.locator('.aa-status').innerText()).includes('1 objects'));
 await p.screenshot({path:'ui-artifacts/arrange-inches.png'});await p.locator('[data-aa="close"]').first().click();
 const areaBefore=await p.evaluate(()=>({...__senzTest.editor.page.arrangeBox}));const border=await p.locator('.arrange-box .aa-edge.bottom').boundingBox();await p.mouse.move(border.x+70,border.y+5);await p.mouse.down();await p.mouse.move(border.x+105,border.y+35,{steps:5});await p.mouse.up();assert((await p.evaluate(()=>__senzTest.editor.page.arrangeBox.x))>areaBefore.x,'Box remains draggable without Edit button');assert(!await win.isVisible(),'Direct box move keeps window closed');
 console.log('PASS: inches, 4mm default gap, window drag, mixed object arrange, live selection colors, color-only arrange, adjustable gaps and persistent box drag.');
}
async function checkVectorBoxes(p,assert){
 await p.evaluate(async()=>{
  const e=__senzTest.editor;e.addPage();e.resizeCanvas(300,200);
  const {makeText}=await import('/core.js'),{measureText}=await import('/editor.js');
  const text=makeText('Editable SENZ',35,35,{font:'Poppins',size:25,color:'#ff0000'});Object.assign(text,measureText(text));text.id='box-text';e.add(text);
  for(const [i,type] of ['shape','icon','image'].entries())e.add({id:'box-'+type,type,shape:'circle',icon:'star',src:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="45"><path d="M0 0H60V45H0Z" fill="#ff0000"/></svg>'),vector:true,x:35+i*150,y:160,w:100,h:70,rotation:0,color:'#ff0000'});
  e.fit();
 });
 for(const type of ['text','shape','icon','image']){
  await p.evaluate(type=>__senzTest.editor.select('box-'+type),type);
  await p.waitForFunction(()=>document.querySelector('#text-frame').checked===!!__senzTest.editor.selected.frameEnabled);
  assert.equal(await p.locator('#text-frame').isDisabled(),false,`${type} enables Vector Box`);
  await p.locator('#text-frame').evaluate(el=>el.click());
  let before=await p.evaluate(()=>{const o=__senzTest.editor.selected,r=document.querySelector(`[data-object="${o.id}"] [data-vector-box]`);return {o:structuredClone(o),stroke:r?.getAttribute('stroke'),width:Number(r?.getAttribute('width'))};});
  assert.equal(before.o.type,type);assert.equal(before.o.frameEnabled,true,type+' frame enables');assert.equal(before.stroke,'#ff0000');
  await p.evaluate(()=>{const e=__senzTest.editor;e.updateSelected({color:'#0000ff'});const o=e.selected;e.updateSelected(o.type==='text'?{size:o.size*1.25}:{w:o.w*1.5,h:o.h*1.5});});
  let after=await p.evaluate(async()=>{const o=__senzTest.editor.selected,{objectMarkup}=await import('/editor.js'),{visibleBounds}=await import('/object-transform.js'),r=document.querySelector(`[data-object="${o.id}"] [data-vector-box]`);return {o:structuredClone(o),stroke:r?.getAttribute('stroke'),width:Number(r?.getAttribute('width')),markup:objectMarkup(o),bounds:visibleBounds(o)};});
  assert.equal(after.o.type,type,'Original artwork is not flattened');assert.equal(after.o.color,'#0000ff');assert.equal(after.stroke,before.stroke,'Recolor leaves frame unchanged');assert(after.width>before.width,'Box follows resized artwork');assert(after.bounds.w>after.width,'Selection includes frame stroke');assert(after.markup.includes('stroke="#ff0000"'),'Export markup preserves frame color');
  if(type==='text')assert.equal(after.o.text,'Editable SENZ');
  if(type==='image')assert(after.markup.includes('#0000ff'),'SVG artwork recolors');
 }
 const checked=await p.evaluate(async()=>{
  const e=__senzTest.editor,{packProject,unpackProject}=await import('/project-storage.js');e.load(unpackProject(packProject(e.project)));return e.page.objects;
 });
 // Load opens page zero; return to the new test page.
 await p.evaluate(()=>{const e=__senzTest.editor;e.changePage(e.project.pages.length-1);e.select('box-shape');});
 assert.equal(await p.evaluate(()=>__senzTest.editor.selected.frameColor),'#ff0000','Frame color survives save/load');
 await p.waitForFunction(()=>document.querySelector('#text-frame').checked===true);await p.locator('#text-frame').evaluate(el=>el.click());assert.equal(await p.locator('[data-object="box-shape"] [data-vector-box]').count(),0);
 await p.evaluate(()=>{const e=__senzTest.editor;e.undo();e.select('box-shape');});assert.equal(await p.locator('[data-object="box-shape"] [data-vector-box]').count(),1,'Undo restores box');
 // Test fixed opposite corner during a framed image resize, including mirror state.
 const anchored=await p.evaluate(async()=>{const e=__senzTest.editor,o=e.page.objects.find(o=>o.id==='box-image'),{visibleBounds,resizeObject}=await import('/object-transform.js');const original=structuredClone(o),b=visibleBounds(o),x=o.x+b.x,y=o.y+b.y;resizeObject({object:o,original,ink:b,handle:'se'},35,20);e.refresh();const n=visibleBounds(o);return Math.abs(o.x+n.x-x)<.001&&Math.abs(o.y+n.y-y)<.001;});assert(anchored,'Frame resize anchor is stable');
 await p.evaluate(()=>document.querySelector('[data-focus-mode="focus"]').click());await p.waitForFunction(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 assert.equal(await p.locator('#focus-vector-box').isDisabled(),false);
 await p.locator('#focus-vector-box').evaluate(el=>el.click());assert.equal(await p.locator('[data-object="box-shape"] [data-vector-box]').count(),0);
 await p.locator('#focus-vector-box').evaluate(el=>el.click());assert.equal(await p.locator('[data-object="box-shape"] [data-vector-box]').count(),1);
 await p.evaluate(()=>document.querySelector('.focus-bottom [data-focus-mode="desktop"]').click());await p.waitForFunction(()=>!document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 await p.screenshot({path:'ui-artifacts/vector-box-editable.png'});
 await p.evaluate(async()=>{const e=__senzTest.editor;e.select(['box-shape','box-icon','box-image']);const {separateVectorBoxes}=await import('/vector-box.js');separateVectorBoxes(e);});
 const separated=await p.evaluate(()=>__senzTest.editor.selectedObjects);assert.equal(separated.length,3);assert(separated.every(o=>o.color==='#ff0000'&&o.name==='Vector box'),'Separate supports every object and preserves frame paint');
 console.log('PASS: editable text, shape, icon and SVG boxes; independent color; resize and image render cache; selection bounds; export; save/load; undo; detach.');
}
async function checkSharedBox(p,assert){
 await p.evaluate(async()=>{const e=__senzTest.editor,{makeText}=await import('/core.js'),{measureText}=await import('/editor.js'),{expandAndUnite}=await import('/vector.js');e.addPage();e.resizeCanvas(300,160);const text=makeText('teena',40,50,{font:'Poppins',size:70,color:'#000000'});Object.assign(text,measureText(text));text.id='shared-text';await expandAndUnite(text,__senzTest.fonts);e.add(text);e.add({id:'shared-icon',type:'icon',icon:'star',x:text.x+text.w+15,y:50,w:100,h:100,color:'#000000'});e.select(['shared-text','shared-icon']);e.fit();});
 await p.waitForFunction(()=>!document.querySelector('#text-frame').checked);await p.locator('#text-frame').evaluate(el=>el.click());
 let result=await p.evaluate(()=>({objects:structuredClone(__senzTest.editor.page.objects),selection:__senzTest.editor.selection}));
 let box=result.objects.find(o=>o.vectorBoxContainer);assert(box,'One common box exists');assert.equal(result.objects.filter(o=>o.vectorBoxContainer).length,1);assert(result.objects.filter(o=>!o.vectorBoxContainer).every(o=>!o.frameEnabled),'No individual boxes');assert.equal(await p.locator('#canvas [data-vector-box]').count(),0);
 await p.evaluate(()=>__senzTest.editor.select([]));const hit=await p.locator('[data-object="shared-text"]').boundingBox();await p.mouse.click(hit.x+hit.width/2,hit.y+hit.height/2);assert.deepEqual(await p.evaluate(()=>__senzTest.editor.selection),['shared-text'],'Box interior does not intercept artwork selection');
 const bounds=await p.evaluate(async()=>{const {inkBounds}=await import('/auto-arrange.js');return __senzTest.editor.page.objects.filter(o=>!o.vectorBoxContainer).map(inkBounds);});for(const b of bounds){assert(b.x>box.x&&b.y>box.y);assert(b.x+b.w<box.x+box.w&&b.y+b.h<box.y+box.h);}
 await p.evaluate(()=>{const e=__senzTest.editor;e.select('shared-text');e.updateSelected({text:'teena love',size:85,color:'#0000ff'});});
 await p.waitForFunction(()=>document.querySelector('#text-frame').checked);
 const next=await p.evaluate(()=>__senzTest.editor.page.objects.find(o=>o.vectorBoxContainer));assert(next.w>box.w);assert.equal(next.color,'#000000');
 // Selecting the border moves the complete design; selecting lettering keeps it editable.
 await p.evaluate(id=>__senzTest.editor.select(id),box.id);assert.equal(await p.evaluate(()=>__senzTest.editor.selection.length),3);await p.evaluate(()=>__senzTest.editor.updateSelected({color:'#00aa00'}));assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.find(o=>o.vectorBoxContainer).color),'#000000');
 // One duplicate creates one independent box, linked only to the copied artwork.
 await p.evaluate(()=>__senzTest.editor.duplicate());const copied=await p.evaluate(()=>__senzTest.editor.selectedObjects);assert.equal(copied.length,3);const copyBox=copied.find(o=>o.vectorBoxContainer);assert(copyBox.vectorBoxGroup!==box.vectorBoxGroup);assert(copied.every(o=>o.vectorBoxGroup===copyBox.vectorBoxGroup));
 await p.evaluate(()=>__senzTest.editor.undo());assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.filter(o=>o.vectorBoxContainer).length),1);
 await p.evaluate(async()=>{const e=__senzTest.editor,{packProject,unpackProject}=await import('/project-storage.js');e.load(unpackProject(packProject(e.project)));e.changePage(e.project.pages.length-1);e.select('shared-icon');const o=e.selected;o.x+=80;e.renderMoved([o]);e.commit();});
 const moved=await p.evaluate(()=>__senzTest.editor.page.objects.find(o=>o.vectorBoxContainer));assert(moved.w>=next.w,'Box updates after moving member and reopening project');
 const exported=await p.evaluate(async()=>{const {makeSVG}=await import('/export.js'),e=__senzTest.editor;return makeSVG(e.project,e.page,__senzTest.fonts);});assert.equal((exported.match(/data-ai-object=/g)||[]).length,3,'Export includes two artwork objects and one box');assert(exported.includes('stroke="#000000"'),'Export box stays black');
 await p.screenshot({path:'ui-artifacts/shared-vector-box.png'});
 await p.evaluate(()=>document.querySelector('[data-focus-mode="focus"]').click());await p.waitForFunction(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));assert(await p.locator('#focus-vector-box').isChecked());await p.locator('#focus-vector-box').evaluate(el=>el.click());assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.filter(o=>o.vectorBoxContainer).length),0,'Toggle removes shared box without deleting artwork');assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.length),2);
 await p.evaluate(()=>{__senzTest.editor.undo();document.querySelector('.focus-bottom [data-focus-mode="desktop"]').click();});await p.waitForFunction(()=>!document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 console.log('PASS: one outer box across selected artwork, editable text, independent paint, live bounds, border selection, duplication links, save/load, undo, export and Focus toggle.');
}
async function checkDenseArrange(p,assert){
 const dims=await p.evaluate(async()=>{const e=__senzTest.editor,{makeText}=await import('/core.js'),{measureText}=await import('/editor.js'),{expandAndUnite}=await import('/vector.js'),{inkBounds}=await import('/auto-arrange.js');e.addPage();e.resizeCanvas(300,180);const o=makeText('ROTATE ME',100,100,{font:'Poppins',size:32,color:'#0055ff'});o.id='dense-text';Object.assign(o,measureText(o));await expandAndUnite(o,__senzTest.fonts);e.add(o);e.add({id:'dense-small',type:'shape',shape:'rectangle',x:320,y:150,w:10,h:10,color:'#ff0000',rotation:0});e.add({id:'dense-overflow',type:'shape',shape:'rectangle',x:450,y:100,w:600,h:600,color:'#333333',rotation:0});const b=inkBounds(o),gap=4*96/25.4;e.select([]);e.fit();__senzTest.actions['auto-arrange']();return {w:b.h,h:b.w+gap+10};});
 await p.locator('#aa-layout').selectOption('dense');await p.locator('#aa-rotate').check();await p.locator('#aa-separate').uncheck();await p.locator('#aa-direction').selectOption('row');
 for(const id of ['left','top','right','bottom']){await p.locator('#aa-'+id).fill('0');await p.locator('#aa-'+id).press('Tab');}
 for(const id of ['gap-x','gap-y']){await p.locator('#aa-'+id).fill(String(4/25.4));await p.locator('#aa-'+id).press('Tab');}
 await p.locator('#aa-width').fill(String(dims.w/96));await p.locator('#aa-width').press('Tab');await p.locator('#aa-height').fill(String(dims.h/96));await p.locator('#aa-height').press('Tab');
 const before=await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects));await p.locator('[data-aa="preview"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Preview:'));assert.equal(await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects)),before);assert((await p.locator('.aa-status').innerText()).includes('remaining'));
 await p.locator('[data-aa="apply"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Arranged:'));
 const result=await p.evaluate(async()=>{const e=__senzTest.editor,{inkBounds}=await import('/auto-arrange.js');return {box:e.page.arrangeBox,objects:e.page.objects.map(o=>({id:o.id,rotation:o.rotation,w:o.w,h:o.h,b:inkBounds(o)}))};});const text=result.objects.find(o=>o.id==='dense-text'),small=result.objects.find(o=>o.id==='dense-small'),overflow=result.objects.find(o=>o.id==='dense-overflow');assert.equal(text.rotation,90,'Text rotates to fit narrow space');for(const o of [text,small]){assert(o.b.x>=result.box.x-.001&&o.b.y>=result.box.y-.001);assert(o.b.x+o.b.w<=result.box.x+result.box.w+.001&&o.b.y+o.b.h<=result.box.y+result.box.h+.001);}assert(overflow.b.x>result.box.x+result.box.w,'Overflow is parked outside');assert(small.b.y>=text.b.y+text.b.h+4*96/25.4-.001,'Default gap survives rotation');const originals=JSON.parse(before);for(const o of result.objects){const r=originals.find(r=>r.id===o.id);assert.equal(o.w,r.w);assert.equal(o.h,r.h);}
 await p.screenshot({path:'ui-artifacts/force-fill-rotate.png'});await p.evaluate(()=>__senzTest.editor.undo());assert.equal(await p.evaluate(()=>JSON.stringify(__senzTest.editor.page.objects)),before,'Single undo restores positions and rotations');
 await p.locator('#aa-rotate').uncheck();await p.locator('[data-aa="preview"]').click();await p.waitForFunction(()=>document.querySelector('.aa-status').textContent.startsWith('Preview:'));assert((await p.locator('.aa-status').innerText()).includes('0 groups rotated'));
 await p.locator('[data-aa="close"]').first().click();console.log('PASS: real editable text rotation, mixed objects, adjustable 4mm gap, preview isolation, overflow parking, original size preservation, no rotation option and one-step Undo.');
}
async function checkIndividualTextBoxes(p,assert){
 await p.evaluate(async()=>{const e=__senzTest.editor,{makeText}=await import('/core.js'),{measureText}=await import('/editor.js'),{expandAndUnite}=await import('/vector.js');e.addPage();e.resizeCanvas(300,200);for(let i=0;i<3;i++){const o=makeText(['SENZ','AMIR','HAIKAL'][i],100,70+i*110,{font:'Poppins',size:42,color:['#ff0000','#0000ff','#000000'][i]});o.id='individual-'+i;Object.assign(o,measureText(o));await expandAndUnite(o,__senzTest.fonts);e.add(o);}e.select([]);e.fit();});
 await p.locator('#viewport').focus();await p.keyboard.press('Control+a');assert.equal(await p.evaluate(()=>__senzTest.editor.selectedObjects.length),3);await p.waitForFunction(()=>!document.querySelector('#text-frame').checked);await p.locator('#text-frame').evaluate(el=>el.click());
 assert.equal(await p.locator('#canvas [data-vector-box]').count(),3,'Ctrl+A creates one box for each text');assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.length),3,'No large shared rectangle is created');await p.waitForFunction(()=>document.querySelector('#text-frame').checked);
 const before=await p.evaluate(()=>__senzTest.editor.page.objects.map(o=>({id:o.id,frameColor:o.frameColor})));
 await p.locator('#frame-gap-x').evaluate(el=>{el.value='0.1';el.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await p.locator('#canvas [data-vector-box]').count(),3,'Batch gap edit keeps individual boxes');assert(await p.evaluate(()=>__senzTest.editor.page.objects.every(o=>Math.abs(o.frameGapX-2.54)<1e-5)));
 await p.evaluate(()=>__senzTest.editor.updateSelected({color:'#00aa00',size:50}));const after=await p.evaluate(()=>__senzTest.editor.page.objects);assert.deepEqual(after.map(o=>({id:o.id,frameColor:o.frameColor})),before);assert(after.every(o=>o.color==='#00aa00'&&o.size===50&&o.frameEnabled));
 await p.screenshot({path:'ui-artifacts/individual-text-boxes.png'});
 await p.locator('#text-frame').evaluate(el=>el.click());assert.equal(await p.locator('#canvas [data-vector-box]').count(),0,'Uncheck removes all individual frames');await p.evaluate(()=>__senzTest.editor.undo());assert.equal(await p.locator('#canvas [data-vector-box]').count(),3,'Undo restores all individual frames');
 await p.evaluate(async()=>{const {packProject,unpackProject}=await import('/project-storage.js'),e=__senzTest.editor;e.load(unpackProject(packProject(e.project)));e.changePage(e.project.pages.length-1);e.select(e.page.objects.map(o=>o.id));});assert.equal(await p.locator('#canvas [data-vector-box]').count(),3,'Individual boxes survive save/load');
 await p.evaluate(()=>document.querySelector('[data-focus-mode="focus"]').click());await p.waitForFunction(()=>document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));assert(await p.locator('#focus-vector-box').isChecked());await p.locator('#focus-vector-box').evaluate(el=>el.click());assert.equal(await p.locator('#canvas [data-vector-box]').count(),0);await p.locator('#focus-vector-box').evaluate(el=>el.click());assert.equal(await p.locator('#canvas [data-vector-box]').count(),3,'Focus creates one per selected text');
 await p.evaluate(()=>document.querySelector('.focus-bottom [data-focus-mode="desktop"]').click());await p.waitForFunction(()=>!document.body.classList.contains('focus-mode')&&!document.body.classList.contains('mode-transitioning'));
 // Existing combined text frames convert explicitly, preserving their gap and paint.
 await p.evaluate(()=>{const e=__senzTest.editor;e.applyChange(()=>{for(const o of e.page.objects){o.frameEnabled=false;delete o.frameColor;o.vectorBoxGroup='old-batch';}e.page.objects.push({id:'old-batch-box',type:'shape',shape:'rectangle',vectorBoxContainer:true,vectorBoxGroup:'old-batch',color:'#993399',frameGapX:2,frameGapY:1,frameThickness:.5,x:0,y:0,w:1,h:1});});e.select(e.page.objects.map(o=>o.id));});await p.waitForFunction(()=>!document.querySelector('#text-frame').checked);await p.locator('#text-frame').evaluate(el=>el.click());assert.equal(await p.locator('#canvas [data-vector-box]').count(),3);assert(await p.evaluate(()=>__senzTest.editor.page.objects.every(o=>o.type==='text'&&o.frameEnabled&&o.frameColor==='#993399'&&o.frameGapX===2&&!o.vectorBoxGroup)),'Legacy combined box converts to individual frames');await p.evaluate(()=>__senzTest.editor.undo());assert.equal(await p.evaluate(()=>__senzTest.editor.page.objects.filter(o=>o.vectorBoxContainer).length),1,'Undo restores original shared box');
 console.log('PASS: Ctrl+A individual text frames, batch gap editing, stable paint, resize, toggle, Undo, save/load, Focus, and explicit legacy shared-box conversion.');
}
async function checkNameEmojiBoxes(p,assert){
 await p.evaluate(async()=>{const e=__senzTest.editor,{makeText}=await import('/core.js'),{measureText}=await import('/editor.js'),{expandAndUnite}=await import('/vector.js');e.addPage();e.resizeCanvas(300,240);e.project.emojiVectorMode=true;
 const entries=[['name-inline-1','teena😘',80,50,null],['name-inline-2','AMIR❤️',80,190,null],['name-linked-1','LIEYA',80,330,'design-a'],['emoji-linked-1','😘',330,330,'design-a'],['name-linked-2','SENZ',80,470,'design-b'],['emoji-linked-2','🙂',330,470,'design-b']];
 for(const [id,text,x,y,groupId] of entries){const o=makeText(text,x,y,{font:'Poppins',size:44,color:'#000000',emojiVector:true});o.id=id;if(groupId)o.groupId=groupId;Object.assign(o,measureText(o));await expandAndUnite(o,__senzTest.fonts);e.add(o);}e.select([]);e.fit();});
 await p.locator('#viewport').focus();await p.keyboard.press('Control+a');await p.waitForFunction(()=>!document.querySelector('#text-frame').checked);await p.locator('#text-frame').evaluate(el=>el.click());
 const state=()=>p.evaluate(async()=>{const {inkBounds}=await import('/auto-arrange.js');return {objects:structuredClone(__senzTest.editor.page.objects),ink:Object.fromEntries(__senzTest.editor.page.objects.map(o=>[o.id,inkBounds(o)])),inline:document.querySelectorAll('#canvas [data-vector-box]').length};});
 let r=await state();assert.equal(r.inline,2,'Inline name plus emoji has one rectangle each');assert.equal(r.objects.filter(o=>o.vectorBoxContainer).length,2,'Each linked name and emoji shares one rectangle');assert.equal(r.objects.filter(o=>o.frameEnabled).length+r.objects.filter(o=>o.vectorBoxContainer).length,4,'Four names produce exactly four boxes');
 for(const id of ['design-a','design-b']){const members=r.objects.filter(o=>o.groupId===id),keys=new Set(members.map(o=>o.vectorBoxGroup));assert.equal(keys.size,1);const b=r.objects.find(o=>o.vectorBoxContainer&&keys.has(o.vectorBoxGroup));assert(b&&members.every(o=>{const ink=r.ink[o.id];return b.x<ink.x&&b.y<ink.y&&b.x+b.w>ink.x+ink.w&&b.y+b.h>ink.y+ink.h;}));}
 await p.waitForFunction(()=>document.querySelector('#text-frame').checked);await p.locator('#frame-gap-x').evaluate(el=>{el.value='0.1';el.dispatchEvent(new Event('change',{bubbles:true}));});r=await state();assert(r.objects.filter(o=>o.vectorBoxContainer||o.frameEnabled).every(o=>Math.abs(o.frameGapX-2.54)<1e-5),'Batch gap affects each name box');
 await p.evaluate(()=>{const e=__senzTest.editor;e.select('name-inline-1');e.updateSelected({color:'#0000ff',size:50});e.select(e.page.objects.map(o=>o.id));});await p.waitForFunction(()=>document.querySelector('#text-frame').checked);
 await p.screenshot({path:'ui-artifacts/per-name-emoji-boxes.png'});
 await p.locator('#text-frame').evaluate(el=>el.click());r=await state();assert.equal(r.inline,0);assert.equal(r.objects.filter(o=>o.vectorBoxContainer).length,0);await p.waitForFunction(()=>!document.querySelector('#text-frame').checked);await p.locator('#text-frame').evaluate(el=>el.click());r=await state();assert.equal(r.inline+r.objects.filter(o=>o.vectorBoxContainer).length,4,'Toggle preserves the name/emoji association');
 await p.evaluate(async()=>{const e=__senzTest.editor,{packProject,unpackProject}=await import('/project-storage.js');e.load(unpackProject(packProject(e.project)));e.changePage(e.project.pages.length-1);e.select(e.page.objects.map(o=>o.id));});await p.waitForFunction(()=>document.querySelector('#text-frame').checked);r=await state();assert.equal(r.inline+r.objects.filter(o=>o.vectorBoxContainer).length,4,'Save/load keeps one box per complete name');
 const svg=await p.evaluate(async()=>{const e=__senzTest.editor,{makeSVG}=await import('/export.js');return makeSVG(e.project,e.page,__senzTest.fonts);});assert.equal((svg.match(/data-vector-box=/g)||[]).length,2);assert.equal((svg.match(/data-ai-object=/g)||[]).length,8,'Export keeps six artwork objects and two linked boxes');
 console.log('PASS: inline vector emoji and grouped name/emoji batches produce one full rectangle per name, preserve associations through toggle/save/load, maintain batch gaps and export.');
}
