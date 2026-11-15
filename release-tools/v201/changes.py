from pathlib import Path
import re,shutil

def patch(app):
 names=[];removed=[]
 def edit(name,fn):
  p=app/name;s=p.read_text(encoding='utf-8');out=fn(s);assert out!=s,name;p.write_bytes(out.encode());names.append(name)
 def sub(s,a,b):
  assert a in s,a
  return s.replace(a,b)
 edit('dist/retired-apps.js',lambda s:sub(s,"new Set([","new Set(['suite.ds', "))
 edit('dist/suite/catalog.js',lambda s:re.sub(r'^ds\|.*\n','',s,flags=re.M))
 def store(s):
  s=sub(s,"'gba','ds','nes'","'gba','nes'")
  s=sub(s,"a.family==='ds'?(await import('./ds-launcher.js')).openDS():",'')
  return sub(s,"a.family==='ds'?import('./ds-launcher.js').then(m=>m.closeDS()):",'')
 edit('dist/store-catalog.js',store)
 def main(s):
  s=re.sub(r'^const dsApp=.*\n','',s,flags=re.M)
  s=sub(s,'...dsApp.windows(),','');s=sub(s,'await dsApp.close();','')
  s=sub(s,"const root=path.join(__dirname,'dist');", "const root=path.join(__dirname,'dist');\nconst optionalAI=require('./optional-ai.cjs').createOptionalAI({cacheDir:()=>path.join(app.getPath('userData'),'optional-ai'),fetch:(...args)=>net.fetch(...args)});")
  needle="   const base=root;const file=path.resolve(base,'.'+rel);"
  code="""   if(rel==='/vendor/remover/u2net.onnx')return optionalAI.ensure().then(file=>net.fetch(pathToFileURL(file).href)).then(r=>{const headers=new Headers(r.headers);headers.set('Cross-Origin-Opener-Policy','same-origin');headers.set('Cross-Origin-Embedder-Policy','require-corp');headers.set('Cross-Origin-Resource-Policy','same-origin');return new Response(r.body,{status:r.status,headers});}).catch(e=>new Response('Detailed AI requires its one-time model download. Connect to the internet and retry, or select Fast quality. '+e.message,{status:503,headers:{'Content-Type':'text/plain'}}));
"""
  return sub(s,needle,code+needle)
 edit('main.cjs',main)
 edit('preload.cjs',lambda s:re.sub(r'^ ds:action=>ipcRenderer.invoke\(\x27ds-launch\x27,action\),\n','',s,flags=re.M))
 for name in ['ds-main.cjs','ds-preload.cjs','dist/ds-launcher.js']:
  (app/name).unlink();removed.append(name)
 ds=app/'dist/ds';removed.extend(p.relative_to(app).as_posix() for p in ds.rglob('*') if p.is_file());shutil.rmtree(ds)
 model=app/'dist/vendor/remover/u2net.onnx';Path('release-assets').mkdir(exist_ok=True);shutil.copy2(model,'release-assets/U2NET-DETAILED.onnx');model.unlink();removed.append('dist/vendor/remover/u2net.onnx')
 shutil.copy2(Path(__file__).with_name('optional-ai.cjs'),app/'optional-ai.cjs');names.append('optional-ai.cjs')
 def worker(s):
  old="sessionPromise ||= ort.InferenceSession.create(new URL(quality==='detailed'?'./vendor/remover/u2net.onnx':'./vendor/remover/u2netp.onnx',import.meta.url).href,{executionProviders:['wasm'],graphOptimizationLevel:'all'}).catch(e=>{sessionPromise=null;throw e;});"
  new="sessionPromise ||= (async()=>{let source=new URL(quality==='detailed'?'./vendor/remover/u2net.onnx':'./vendor/remover/u2netp.onnx',import.meta.url).href;if(quality==='detailed'){progress('Preparing Detailed AI — first use downloads 176 MB; later uses work offline…');const response=await fetch(source);if(!response.ok)throw Error((await response.text()).slice(0,400)||'Detailed AI model unavailable. Connect to the internet or select Fast.');source=new Uint8Array(await response.arrayBuffer());}return ort.InferenceSession.create(source,{executionProviders:['wasm'],graphOptimizationLevel:'all'});})().catch(e=>{sessionPromise=null;throw e;});"
  return sub(s,old,new)
 edit('dist/background-remove-worker.js',worker)
 edit('dist/background-remover.js',lambda s:sub(s,'Detailed AI uses more memory and time. Fast is suitable for slower PCs.','Detailed AI downloads a 176 MB model once, then works offline. Fast is included and works offline immediately.'))
 for name in ['package.json','dist/app.js','dist/index.html']:edit(name,lambda s:sub(s,'2.9.200','2.9.201'))
 return names,removed
