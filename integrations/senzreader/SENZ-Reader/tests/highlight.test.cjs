const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),P=require('../parser.js');
function element(text,parent=null){const classes=new Set(),css=new Map();return {style:{setProperty:(k,v,p)=>css.set(k,[v,p]),getPropertyValue:k=>css.get(k)?.[0]||'',getPropertyPriority:k=>css.get(k)?.[1]||''},textContent:text,parentElement:parent,hasAttribute:()=>false,getAttribute:()=>null,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)}};}
const body=element(''),container=element('',body);const missing=element('Order ID: 5871355906205237758\nStiker nama rainbow laser\nA6, 8INCH X 2INCH\nx1',container),named=element('Order ID: 587136660646954280\nStiker nama rainbow laser\nA10, 5INCH X 2INCH\nx1\nCustomer message: Awe@sha❤️',container);
container.textContent=missing.textContent+'\n'+named.textContent;const header1=element('Order ID: 5871355906205237758',missing),header2=element('Order ID: 587136660646954280',named),nodes=[header1,missing,header2,named,container];let style=null;
const document={body,head:{append:e=>style=e},getElementById:()=>style,createElement:()=>({}),querySelectorAll:q=>q.startsWith('.')?nodes.filter(n=>n.classList.contains('senz-reader-missing-name')):nodes};const ctx={document,clearTimeout,setTimeout};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../scanner.js','utf8'),ctx);
const parsed=P.parse({text:container.textContent},'Stiker nama rainbow laser',[]);const absent=parsed.filter(r=>!P.customerName(r.raw));assert.equal(absent.length,1);assert.equal(P.customerName(named.textContent),'Awe@sha❤️');assert.equal(P.customerName('Customer message:\nSeller-signed creator'),'');assert.equal(P.customerName('Customer message: N/A'),'');assert.equal(P.customerName('Customer message: ❤️'),'');
const result=ctx.highlightMissingNames(absent.map(r=>r.order_id),'Stiker nama rainbow laser');assert.equal(result.highlighted,1);assert.equal(missing.classList.contains('senz-reader-missing-name'),true);assert.equal(named.classList.contains('senz-reader-missing-name'),false);assert.equal(container.classList.contains('senz-reader-missing-name'),false);ctx.highlightMissingNames([],'Unmatched product');assert.equal(missing.classList.contains('senz-reader-missing-name'),false);
console.log('Name/highlight regression passed: only missing-name card yellow; named sibling untouched; old highlight cleared; blank/placeholder/emoji-only note excluded.');

// TikTok joins badge text and splits the label from the numeric ID.
missing.textContent=missing.textContent.replace('7758\n','7758Pre-order\n');header1.textContent='5871355906205237758Pre-order';container.textContent=missing.textContent+'\n'+named.textContent;assert.equal(ctx.highlightMissingNames(['5871355906205237758'],'Stiker nama rainbow laser').highlighted,1);assert.equal(container.classList.contains('senz-reader-missing-name'),false);

assert.equal(missing.style.getPropertyValue('background-color'),'#fff4bf');assert.equal(missing.style.getPropertyPriority('background-color'),'important');ctx.highlightMissingNames([],'Unmatched product');assert.equal(missing.style.getPropertyValue('background-color'),'');

assert.equal(ctx.highlightMissingNames([],'Stiker nama rainbow laser').highlighted,1,'DOM detection independent of parsed rows');missing.textContent+='\nCustomer message: Senz';container.textContent=missing.textContent+'\n'+named.textContent;assert.equal(ctx.highlightMissingNames(['5871355906205237758'],'Stiker nama rainbow laser').highlighted,0,'Newly provided name clears stale highlight');

// Text-level highlighting uses ranges without modifying page text or selection.
missing.textContent=missing.textContent.split('\nCustomer message:')[0];container.textContent=missing.textContent+'\n'+named.textContent;
const highlights=new Map();ctx.CSS={highlights};ctx.Highlight=class{constructor(...ranges){this.ranges=ranges;}};
document.createTreeWalker=el=>{let done=false;return {nextNode:()=>{if(done)return null;done=true;return {textContent:el.textContent,parentElement:{closest:()=>null}};}};};document.createRange=()=>({selectNodeContents(node){this.node=node;}});
ctx.highlightMissingNames([],'Stiker nama rainbow laser');assert.equal(highlights.size,0,'No gray text selection overlay');ctx.highlightMissingNames([],'Unmatched product');assert.equal(highlights.size,0);

// Overlay stays visible independently of card styling and is removed on rescan.
const overlays=[];document.body.append=el=>overlays.push(el);document.createElement=()=>({style:{},setAttribute(){},append(){},remove(){this.removed=true;}});missing.getBoundingClientRect=()=>({left:10,top:80,width:900,height:200});
ctx.highlightMissingNames([],'Stiker nama rainbow laser');assert.equal(overlays.length,1);assert.equal(overlays[0].style.width,'900px');ctx.highlightMissingNames([],'Unmatched product');assert.equal(overlays[0].removed,true);
// No readable Order ID: identify the card by its product title and stop at siblings.
ctx.highlightMissingNames([],'Unmatched product');missing.textContent='Stiker nama rainbow laser\nA6, 8INCH X 2INCH\nx1\nAwaiting shipment';header1.textContent='';
const title1=element('Stiker nama rainbow laser',missing),title2=element('Stiker nama rainbow laser',named);title1.children=[];title2.children=[];missing.children=[title1];named.children=[title2];container.children=[missing,named];container.textContent=missing.textContent+'\n'+named.textContent;nodes.push(title1,title2);
for(const node of nodes)node.contains=other=>{for(let p=other;p;p=p.parentElement)if(p===node)return true;return false;};
assert.equal(ctx.highlightMissingNames([],'Stiker nama rainbow laser').highlighted,0);assert.equal(missing.classList.contains('senz-reader-missing-name'),false);assert.equal(named.classList.contains('senz-reader-missing-name'),false);
console.log('Safety regression passed: product-only rows without a verifiable order boundary are not highlighted.');

// Named messages must override stale missing-name IDs, including labels split across lines.
for(const message of ['Customer\nmessage:\nBunian Wulan','Customer message\n：\nAwe@sha❤️','Customer message: 12345','Customer message: ❤️','Customer message:\nCustomer message: Nihana']){
 named.textContent='Order ID: 587136660646954280\nStiker nama rainbow laser\n'+message;
 container.textContent=missing.textContent+'\n'+named.textContent;
 ctx.highlightMissingNames(['587136660646954280'],'Stiker nama rainbow laser');
 assert.equal(named.classList.contains('senz-reader-missing-name'),false,message);
}
console.log('Named-order protection passed: split labels, numeric/symbol messages, multiple message blocks and stale missing IDs.');

// v2.9.2: label presence alone prevents highlighting, including empty/placeholder values.
for(const message of ['Customer message:', 'Customer message:   ', 'Customer message', 'Customer\nmessage', 'Customer message\nsyazwan Bin mohd yunus', 'Customer message: N/A', 'Customer message: none', 'CUSTOMER MESSAGE：', 'Customer\nmessage\n:', 'Customer\u200b message:']){
 missing.textContent='Order ID: 5871355906205237758\nStiker nama rainbow laser\nx1';
 container.textContent=missing.textContent+'\n'+named.textContent;
 ctx.highlightMissingNames(['5871355906205237758'],'Stiker nama rainbow laser');
 assert.equal(missing.classList.contains('senz-reader-missing-name'),true);
 missing.textContent+='\n'+message;container.textContent=missing.textContent+'\n'+named.textContent;
 const result=ctx.highlightMissingNames(['5871355906205237758'],'Stiker nama rainbow laser');
 assert.equal(result.highlighted,0,message);assert.equal(missing.classList.contains('senz-reader-missing-name'),false,message);assert.equal(missing.style.getPropertyValue('background-color'),'');assert.equal(ctx.__senzHighlight.overlays.length,0);
}
console.log('Label-only rule passed: empty, N/A, none, case, full-width colon, split and invisible characters; old highlight removed.');
