const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const {readerSymbolLayout}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('release-tools/v194/reader-symbol-layout.js','utf8')).toString('base64'));
 const ctx={measureText:s=>({width:s.length*10,actualBoundingBoxRight:s.trimEnd().length*10,actualBoundingBoxLeft:0,actualBoundingBoxAscent:77,actualBoundingBoxDescent:8})};
 const text=s=>({text:s,px:100,font:'Fixture'}),heart=()=>({text:'♥',logo:{width:100,height:91.13411442026867},px:100});
 for(const parts of [[text('Atiqah rahim'),heart()],[heart(),text(' Atiqah rahim')],[text('Atiqah '),heart(),text(' rahim')]]){
  readerSymbolLayout([{parts}],ctx,{size:75});const icon=parts.find(p=>p.logo),height=icon.logo.height*icon.symbolScale;
  assert(Math.abs(height-68)<1e-9);assert(Math.abs(icon.symbolTop+64.25)<1e-9);assert(Math.abs(icon.symbolTop+height-3.75)<1e-9);
  assert(Math.abs(icon.width/height-100/91.13411442026867)<1e-9);
  const i=parts.indexOf(icon);if(i)assert(Math.abs(icon.x-parts[i-1].x-parts[i-1].width-11.9)<1e-9);
 }
 console.log('PASS reference geometry: 85px lettering, 68px heart, 11.9px gap, heart tip 4.25px above lettering bottom');
})();
