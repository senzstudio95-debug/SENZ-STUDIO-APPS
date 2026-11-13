const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve('payload/resources/app/dist');
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.ttf':'font/ttf'};
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(file===path.join(root,'app.js'))data=Buffer.concat([Buffer.from(data.toString().replace('installTikTokOrders({editor,fonts:()=>fonts,ensureFont,toast});','window.__tiktokTest=installTikTokOrders({editor,fonts:()=>fonts,ensureFont,toast});')),Buffer.from('\nwindow.__senzTest={get editor(){return editor},get actions(){return actions},get windows(){return windows},get fonts(){return fonts}};\n')]);res.end(data);});});
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(20000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('ui-artifacts',{recursive:true});
 try{
  await p.goto('http://127.0.0.1:8765');await p.waitForFunction(()=>window.__senzTest?.editor&&document.querySelector('.canvas-guide-layer')&&document.querySelector('.quick-font .qmini-handle'),null,{timeout:90000});
  await p.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});
  await p.locator('#tiktok-orders-open').click();
  await p.locator('#tiktok-orders-window #token').fill('test');
  await p.locator('#tiktok-orders-window #sku').fill('NAME-A');
  await p.locator('#tiktok-orders-window #font').fill('Poppins');
  await p.locator('#tiktok-orders-window #width').fill('4');
  await p.locator('#tiktok-orders-window #save').click();
  assert.match(await p.locator('#tiktok-orders-window #maps').textContent(),/NAME-A/);
  await p.screenshot({path:'ui-artifacts/tiktok-orders.png'});
  await p.evaluate(()=>document.querySelector('#tiktok-orders-window').close());
  const result=await p.evaluate(async()=>{
   const e=__senzTest.editor;e.addPage();const count=e.page.objects.length;
   const item={id:'order:line',orderId:'order',name:'SENZ',font:'Poppins',widthIn:4,color:'#ff0000',quantity:2};
   const n=await window.__tiktokTest.importItems([item]);
   const {getVector}=await import('/vector-cache.js');const widths=e.page.objects.slice(count).map(o=>getVector(o)?.bounds.w);
   let duplicate=false;try{await window.__tiktokTest.importItems([item])}catch{duplicate=true}
   let missing=false;try{await window.__tiktokTest.importItems([{...item,id:'bad',font:'NONEXISTENT'}])}catch{missing=true}
   return {n,widths,duplicate,missing,count:e.page.objects.length-count};
  });assert.equal(result.n,2);assert.equal(result.count,2);assert(result.duplicate);assert(result.missing);for(const w of result.widths)assert(Math.abs(w-384)<.1);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS TikTok UI, mappings, exact size, quantities, deduplication and missing-font validation');
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
