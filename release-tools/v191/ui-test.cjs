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
  let configured=false;
  await p.route('https://senz-tiktok-production.up.railway.app/api/**',async route=>{
   const endpoint=new URL(route.request().url()).pathname;let data={};
   if(endpoint==='/api/setup')data={configured,missing:configured?[]:['TIKTOK_APP_KEY'],callback:'https://senz-tiktok-production.up.railway.app/tiktok/callback'};
   else if(endpoint==='/api/status')data={configured,connected:true,shop:'Fixture Shop'};
   else if(endpoint==='/api/orders')data={items:[]};
   else if(endpoint==='/api/sync')data={items:[{id:'ui:line',orderId:'fixture',product:'Custom name',variant:'Sticker',status:'AWAITING_SHIPMENT',quantity:2,buyerMessage:'AMIR'}]};
   else if(endpoint==='/api/connect')data={url:'https://services.tiktokshop.com/open/authorize?state=test'};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await p.locator('#tiktok-orders-open').click();
  const modal=p.locator('#tiktok-orders-window');
  await p.waitForFunction(()=>document.querySelector('#tiktok-orders-window>div').shadowRoot.querySelector('#setup-status')?.textContent.includes('TIKTOK_APP_KEY'));
  assert(await modal.locator('#connect').isDisabled());assert.equal(await modal.locator('#sku').count(),0);assert(!await modal.innerText().then(t=>/SKU/.test(t)));
  assert.equal(await modal.locator('#connect-url').inputValue(),'https://senz-tiktok-production.up.railway.app/connect');
  await modal.locator('summary').click();await modal.locator('#token').fill('test-owner-key');configured=true;await modal.locator('#status').click();
  await p.waitForFunction(()=>document.querySelector('#tiktok-orders-window>div').shadowRoot.querySelector('#message')?.textContent.includes('Fixture Shop'));
  assert(!await modal.locator('#connect').isDisabled());await modal.locator('#connect').click();await modal.locator('#message a').waitFor();
  await modal.locator('#defaults select[aria-label="Font"]').selectOption('Poppins');
  await modal.locator('#defaults select[aria-label="Lebar (in)"]').selectOption('4');
  await modal.locator('#save').click();await modal.locator('#sync').click();
  await modal.locator('article input[type=text]').fill('AMIR');
  await modal.locator('article select[aria-label="Lebar (in)"]').selectOption('2');
  await modal.locator('article select[aria-label="Warna"]').selectOption('#ff0000');
  await modal.locator('#export').click();
  await p.waitForFunction(()=>__senzTest.editor.page.objects.filter(o=>o.tiktokLineId==='ui:line').length===2);
  const imported=await p.evaluate(async()=>{const {getVector}=await import('/vector-cache.js');return __senzTest.editor.page.objects.filter(o=>o.tiktokLineId==='ui:line').map(o=>({color:o.color,width:getVector(o).bounds.w,font:o.font,text:o.text}))});
  for(const item of imported){assert.equal(item.color,'#ff0000');assert.equal(item.font,'Poppins');assert.equal(item.text,'AMIR');assert(Math.abs(item.width-192)<.1)}
  await p.screenshot({path:'ui-artifacts/tiktok-choice-orders.png'});
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
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS connection setup, font/size/color choices without SKU, canvas sizing, quantities and duplicate checks');
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
