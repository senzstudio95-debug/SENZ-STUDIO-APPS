const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=[];class El{
 constructor(value='',children=[]){this.value=value;this.children=children;this.parentElement=null;this.classes=new Set();this.css=new Map();this.style={setProperty:(k,v,p)=>this.css.set(k,[v,p]),getPropertyValue:k=>this.css.get(k)?.[0]||'',getPropertyPriority:k=>this.css.get(k)?.[1]||''};this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)};children.forEach(c=>c.parentElement=this);nodes.push(this);}
 get textContent(){return [this.value,...this.children.map(c=>c.textContent)].join('\n');}get innerText(){return this.textContent;}
 getAttribute(){return null;}hasAttribute(){return false;}contains(el){for(let p=el;p;p=p.parentElement)if(p===this)return true;return false;}
 querySelectorAll(){return nodes.filter(n=>n!==this&&this.contains(n));}
}
const product='Stiker nama rainbow laser';
function order(id,message){const header=new El('Order ID: '+id),row=new El('x1 Awaiting shipment',[new El(product)]),secondRow=new El('x1',[new El(product)]),footer=new El(message===null?'':'Customer message: '+message);return new El('',[header,row,secondRow,footer]);}
const named=order('587158607701181622','Syzira'),missing=order('587158434723104151',null),named2=order('587158448523282409','bunian Wulan'),emptyLabel=order('587157920663635419','');const body=new El('',[named,missing,named2,emptyLabel]);let style;
const document={body,head:{append:e=>style=e},getElementById:()=>style,createElement:()=>({}),querySelectorAll:q=>q.startsWith('.')?nodes.filter(n=>n.classes.has('senz-reader-missing-name')):nodes.filter(n=>n!==body)};const ctx={document,setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../scanner.js','utf8'),ctx);
const result=ctx.highlightMissingNames(['587158607701181622','587158434723104151','587158448523282409','587157920663635419'],product);
for(const card of [named,named2,emptyLabel])assert.equal(nodes.some(n=>card.contains(n)&&n.classes.has('senz-reader-missing-name')),false,'A product row must not be highlighted when its sibling footer contains the label.');
assert.equal(result.highlighted,1);assert.equal(missing.classes.has('senz-reader-missing-name'),true,'Highlight the entire order, not an isolated product row');
missing.children.at(-1).value='Customer message:';assert.equal(ctx.highlightMissingNames([],product).highlighted,0);assert.equal(nodes.some(n=>n.classes.has('senz-reader-missing-name')),false);assert.equal(missing.style.getPropertyValue('background-color'),'');
console.log('Footer regression passed: only the complete card without a label is yellow; named/empty-label cards and every product row stay clear; later footer clears old paint.');
// Customer message can be a label whose colon is rendered by CSS, absent from DOM text.
named.children[0].value='Order ID: 587161192766211355';
named.children.at(-1).value='Customer message\nsyazwan Bin mohd yunus';
missing.children[0].value='Order ID: 587159059828540987';missing.children.at(-1).value='';
const screenshotCase=ctx.highlightMissingNames([],product);
assert.equal(screenshotCase.highlighted,1,'Only the first screenshot card may be yellow');
assert.equal(named.classes.has('senz-reader-missing-name'),false,'Label protects the second card even without a text colon');
assert.equal(missing.classes.has('senz-reader-missing-name'),true);
