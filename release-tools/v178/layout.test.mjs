import {packItems} from './files/arrange-layout.js';
import assert from 'node:assert/strict';
const items=Array.from({length:12},(_,i)=>({id:String(i),w:20,h:10,color:['red','black','blue'][i%3]})),box={x:10,y:20,w:100,h:60};
for(const column of [false,true])for(const grid of [false,true])for(const separate of [false,true]){
 const p=packItems(items,{...box,h:200},{gapX:2,gapY:2,left:2,top:2,right:2,bottom:2,column,grid,separate});assert.equal(p.positions.length,12);
 for(let i=0;i<12;i++){const a=p.positions[i];assert(a.x>=12&&a.x+20<=108&&a.y>=22&&a.y+10<=218);for(let j=0;j<i;j++){const b=p.positions[j];assert(a.x>=b.x+20||b.x>=a.x+20||a.y>=b.y+10||b.y>=a.y+10,'No overlaps');}}
}
assert.throws(()=>packItems(items,{x:0,y:0,w:5,h:5}),/larger/);assert.throws(()=>packItems(items,box,{left:70,right:40}),/Margins/);assert.throws(()=>packItems(items,box,{gapX:-1}),/negative/);assert.throws(()=>packItems(items,{...box,h:15}),/space/);
console.log('PASS: packing directions, grids, color bands, containment, no overlaps, overflow and invalid margins.');
