const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
const {readerSymbolLayout}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('release-tools/v197/reader-symbol-layout.js','utf8')).toString('base64'));
const ctx={measureText:s=>({width:s.length*12,actualBoundingBoxRight:s.length*12,actualBoundingBoxLeft:0,actualBoundingBoxAscent:77,actualBoundingBoxDescent:0})};
const t=text=>({text,px:100,font:'Reference'}),l=text=>({...t(text),logo:{width:100,height:100}});
const parts=[t('AidaZamri'),l('♥'),l('🎀'),t('ZamZahirah 10'),l('🦋')];readerSymbolLayout([{parts}],ctx,{size:75});
for(const [p,height,top] of [[parts[1],61.6,10.78],[parts[2],55.44,13.86],[parts[4],66.22,13.86]]){assert(Math.abs(p.logo.height*p.symbolScale-height)<1e-6);assert(Math.abs(p.symbolTop+77-top)<1e-6);}
assert(Math.abs(parts[1].x-parts[0].width-6.16)<1e-6);assert(Math.abs(parts[2].x-parts[1].x-parts[1].width-6.16)<1e-6);assert(Math.abs(parts[3].x-parts[2].x-parts[2].width-1.54)<1e-6);
console.log('PASS reference: heart 61.6px, bow 55.44px, butterfly 66.22px against 77px lettering, individually matched vertical offsets and tight gaps');
})();
