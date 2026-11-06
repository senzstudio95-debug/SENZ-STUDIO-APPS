const esbuild=require('esbuild'),fs=require('node:fs'),path=require('node:path');
(async()=>{await esbuild.build({entryPoints:[path.join(__dirname,'src/ui.jsx')],bundle:true,minify:true,platform:'browser',target:'chrome130',outfile:path.join(__dirname,'ui.js'),define:{'process.env.NODE_ENV':'"production"'}});console.log('Built SENZ TUBE React shell');})();
