const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve('payload/resources/app/dist');
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf'};
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(file===path.join(root,'app.js'))data=Buffer.concat([Buffer.from(data.toString().replace('installTikTokOrders({editor,','window.__readerTest=installTikTokOrders({editor,')),Buffer.from('\nwindow.__senzTest={get editor(){return editor},get fonts(){return fonts}};\n')]);res.end(data);});});
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(20000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('ui-artifacts',{recursive:true});
 try{
  await p.goto('http://127.0.0.1:8765');await p.waitForFunction(()=>window.__senzTest?.editor&&document.querySelector('.canvas-guide-layer')&&document.querySelector('.quick-font .qmini-handle'),null,{timeout:90000});
  await p.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  await p.evaluate(()=>{window.__jobs=[{id:'fixture-job',items:[{id:'fixture:1',name:'bunian Wulan💕',font:'Poppins',fontCode:'TEST',widthIn:2,color:'#80caff',quantity:2}]}];window.senzDesktop={readerTake:async()=>__jobs.shift(),readerReview:async()=>({ok:true}),readerResult:async()=>({ok:true}),readerConfig:async()=>({token:'test'})};});
  await p.locator('#senzreader-open').click();const modal=p.locator('#senzreader-window');
  await modal.locator('#rows tr').first().waitFor();
  assert.equal(await modal.locator('#sample').count(),0);
  await modal.locator('#rows .row-case button').filter({hasText:'Title Case'}).click();
  await modal.locator('#wordgap').fill('2');await modal.locator('#letterspacing').fill('1');await modal.locator('#stroke').fill('0.01');await modal.locator('#lettercase').selectOption('title');await modal.locator('#applystyle').click();
  const before=await p.evaluate(()=>({count:__senzTest.editor.page.objects.length,zoom:__senzTest.editor.zoom}));
  await modal.locator('#add').click();
  await p.waitForFunction(n=>__senzTest.editor.page.objects.length===n+2,before.count);
  assert(await modal.isVisible());
  const result=await p.evaluate(async n=>{const {expandAndUnite}=await import('/vector.js');return {zoom:__senzTest.editor.zoom,items:await Promise.all(__senzTest.editor.page.objects.slice(n).map(async o=>({font:o.font,text:o.text,stroke:o.textWeight,word:o.wordSpacing,letter:o.letterSpacing,vector:o.emojiVector,width:(await expandAndUnite(o,__senzTest.fonts)).bounds.w})))}},before.count);
  assert.equal(result.zoom,before.zoom);
  for(const o of result.items){assert.equal(o.vector,true);assert.equal(o.font,'Poppins');assert.equal(o.text,'Bunian Wulan💕');assert.equal(o.stroke,.254);assert.equal(o.word,2);assert.equal(o.letter,1);assert(Math.abs(o.width-192)<.2);}
  const geometry=await p.evaluate(async n=>{const {emojiLayout}=await import('/emoji-vector.js');const o=__senzTest.editor.page.objects[n];const parts=emojiLayout(o).lines[0].parts;const icon=parts.find(p=>p.logo),text=parts.find(p=>!p.logo);if(icon.logo.parts.length!==2)throw Error('Two hearts must have exactly two shapes and no arcs');return {flag:o.readerSymbolLayout,ratio:icon.px/text.px,gap:icon.x-text.x-text.width};},before.count);
  assert.equal(geometry.flag,true);assert(geometry.ratio>0&&geometry.ratio<.9);assert(geometry.gap>0);
  await p.screenshot({path:'ui-artifacts/senzreader-symbols.png'});
  await modal.locator('#close').click();
  await p.screenshot({path:'ui-artifacts/senzreader-symbols-canvas.png'});
  const speed=await p.evaluate(async()=>{
   const e=__senzTest.editor,base=e.page.objects.length,zoom=e.zoom;
   const items=Array.from({length:100},(_,i)=>({id:'speed:'+i,name:'Speed '+i,font:'Poppins',widthIn:2,color:'#111111',quantity:5}));
   for(const item of items)await __readerTest.prepareItem(item);
   let changes=0,selections=0;const change=()=>changes++,select=()=>selections++;e.addEventListener('change',change);e.addEventListener('selection',select);
   const start=performance.now(),work=__readerTest.importItems(items),immediate=e.page.objects.length-base;
   await work;const ms=performance.now()-start;e.removeEventListener('change',change);e.removeEventListener('selection',select);
   const added=e.page.objects.slice(base);const lean=added.every(o=>!('lines' in o)&&!('baseline' in o));const selected=e.selection.length;const bytes=JSON.stringify(added).length;
   e.undo();const undoCount=e.page.objects.length;e.redo();const redoCount=e.page.objects.length;
   return {immediate,ms,changes,selections,lean,selected,bytes,base,undoCount,redoCount,zoomKept:zoom===e.zoom};
  });
  console.log('PREPARED IMPORT BENCHMARK',JSON.stringify(speed));assert.equal(speed.immediate,500);assert.equal(speed.changes,1);assert.equal(speed.selections,1);assert(speed.lean);assert.equal(speed.selected,500);assert.equal(speed.undoCount,speed.base);assert.equal(speed.redoCount,speed.base+500);assert(speed.zoomKept);assert(speed.ms<2000,'Prepared 500-copy import exceeded two seconds on test runner');
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS integrated reader, case, inch stroke, spacing, quantities, vector size, retained zoom and open window');
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});

