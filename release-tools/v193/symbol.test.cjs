const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync('release-tools/v193/reader-symbol-layout.js','utf8');const {readerSymbolLayout}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const ctx={measureText:s=>({width:s.length*10,actualBoundingBoxRight:s.trimEnd().length*10+2,actualBoundingBoxLeft:1,actualBoundingBoxAscent:97,actualBoundingBoxDescent:23})};
 const text=s=>({text:s,px:120,font:'Fixture'}),heart=()=>({text:'♥',logo:{width:100,height:100},px:120});
 for(const parts of [[text('Atiqah Rahim '),heart()],[heart(),text(' Atiqah Rahim')],[text('Atiqah '),heart(),text(' Rahim')]]){
 const lines=[{parts}],width=readerSymbolLayout(lines,ctx,{size:90});assert(width>0);
 const icon=parts.find(p=>p.logo);assert.equal(icon.px,76.8);assert.equal(icon.symbolTop,-75.4);assert(Math.abs(icon.symbolTop+icon.px/2-(-97+120/2))<.0001);
 const index=parts.indexOf(icon);if(index){const prev=parts[index-1];assert(Math.abs(icon.x-prev.x-prev.width-5.4)<.0001)}
 }
 const lines=[{parts:[text('Only name')]}];readerSymbolLayout(lines,ctx,{size:90});assert.equal(lines[0].parts[0].text,'Only name');
 console.log('PASS reference proportions, centered symbols, compact gaps, leading/middle/trailing placements');
})();
