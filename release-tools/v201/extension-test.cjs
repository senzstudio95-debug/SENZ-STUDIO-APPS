const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve('payload/resources/app/reader-extension');
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});});
 await new Promise(r=>server.listen(8766,'127.0.0.1',r));const b=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await b.newPage({viewport:{width:900,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
 await p.addInitScript(()=>{
  if(!localStorage.getItem('fixture-store'))localStorage.setItem('fixture-store',JSON.stringify({studioToken:'test',senzReader:{rows:[{order_id:'587158443472310415',product_name:'Sticker nama',custom_name:'Sakura',font:'A5',size:'5INCH X 2INCH',color:'rainbow',quantity:2,selected:true,reviewed:true,raw:'Order ID: 587158443472310415\nSticker nama\nCustomer message: Sakura dan Hinata',scanned_at:'2026-11-14'}],mapping:[{code:'A5',family:'Poppins'}],history:[],product:'Sticker nama',source:{url:'https://seller-my.tiktok.com/order'}}}));
  window.chrome={storage:{local:{get:async()=>JSON.parse(localStorage.getItem('fixture-store')),set:async value=>localStorage.setItem('fixture-store',JSON.stringify({...JSON.parse(localStorage.getItem('fixture-store')),...value}))}},tabs:{query:async()=>[{id:1}],get:async()=>({id:1,title:'Orders',url:'https://seller-my.tiktok.com/order'})},runtime:{getURL:p=>p,getManifest:()=>({version:'2.9.10'}),sendMessage:async m=>{window.sent=m;return {ok:true,message:'received'};}}};
 });
 await p.goto('http://127.0.0.1:8766/reader.html');await p.locator('#rows .add-name').waitFor();await p.locator('#rows .add-name').click();
 assert.equal(await p.locator('#rows tr').count(),2);
 assert.deepEqual(await p.locator('input[aria-label="quantity"]').evaluateAll(xs=>xs.map(x=>Number(x.value))),[1,1]);
 assert(await p.locator('#rows tr').nth(1).locator('input[aria-label="custom_name"]').evaluate(e=>document.activeElement===e&&e.selectionStart===0&&e.selectionEnd===e.value.length));
 await p.locator('#rows tr').nth(1).locator('input[aria-label="custom_name"]').fill('Hinata');await p.locator('#rows tr').nth(1).locator('input[aria-label="custom_name"]').press('Tab');await p.evaluate(()=>queue);
 const sent=await p.evaluate(async()=>({rows:studioRows(),items:await StudioBridge.buildItems(studioRows())}));assert.deepEqual(sent.items.map(r=>r.name),['Sakura','Hinata']);assert.notEqual(sent.items[0].id,sent.items[1].id);assert(sent.items.every(r=>r.widthIn===5&&r.font==='Poppins'&&r.quantity===1));
 assert.equal(sent.rows[0].order_id,sent.rows[1].order_id);
 await p.reload();await p.locator('#rows tr').nth(1).waitFor();const again=await p.evaluate(()=>StudioBridge.buildItems(studioRows()));assert.deepEqual(again.map(r=>r.id),sent.items.map(r=>r.id));
 await p.locator('#sendStudio').click();assert.deepEqual(await p.evaluate(()=>sent.orders.map(r=>r.custom_name)),['Sakura','Hinata']);
 fs.mkdirSync('ui-artifacts',{recursive:true});await p.screenshot({path:'ui-artifacts/order-pro-add-name-chrome.png'});
 await p.locator('#rows .add-name').nth(1).click();assert.deepEqual(await p.locator('input[aria-label="quantity"]').evaluateAll(xs=>xs.map(x=>Number(x.value))),[1,1,1]);
 const three=await p.evaluate(()=>StudioBridge.buildItems(studioRows()));assert.equal(new Set(three.map(r=>r.id)).size,3);
 const beforeEdit=three[2].id;await p.locator('#rows tr').nth(2).locator('input[aria-label="custom_name"]').fill('Third Name');await p.locator('#rows tr').nth(2).locator('input[aria-label="custom_name"]').press('Tab');assert.equal(await p.evaluate(async()=>(await StudioBridge.buildItems(studioRows()))[2].id),beforeEdit);
 await p.locator('#rows .delete-name').nth(2).click();await p.evaluate(()=>queue);
 assert.equal(await p.locator('#rows tr').count(),2);
 assert.deepEqual(await p.evaluate(async()=>(await StudioBridge.buildItems(studioRows())).map(r=>r.id)),sent.items.map(r=>r.id));
 await p.reload();await p.locator('#rows tr').nth(1).waitFor();assert.equal(await p.locator('#rows tr').count(),2);
 await p.screenshot({path:'ui-artifacts/order-pro-delete-name-chrome.png'});
 await p.locator('#rows .delete-name').first().click();await p.evaluate(()=>queue);
 assert.deepEqual(await p.locator('input[aria-label="custom_name"]').evaluateAll(xs=>xs.map(x=>x.value)),['Hinata']);
 await p.locator('#rows .delete-name').click();await p.evaluate(()=>queue);assert.equal(await p.locator('#rows tr').count(),0);assert(await p.locator('#empty').isVisible());
 await p.reload();await p.waitForFunction(()=>document.getElementById('source').textContent.includes('Orders'));assert.equal(await p.locator('#rows tr').count(),0);
 console.log('PASS Delete Name: correct row only, unchanged IDs, totals, persistence and final-row empty state');
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS Chrome Add Name: copy settings, split quantity, persistent independent IDs, edit/reload/send and quantity-one additions');
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
