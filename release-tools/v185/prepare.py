from pathlib import Path
import hashlib,json,subprocess,shutil,zipfile
import cairosvg
from PIL import Image
root=Path('payload');app=root/'resources/app';dist=app/'dist';src=Path('apps/senz-tube')
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.184.exe')
assert digest(base)=='053897a8bb2490501155ecafdbc2362a4506c14607c8b704e1f19c4b188185ac'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.184'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
runtime_zip=Path('electron-v44.10.2-win32-x64.zip')
assert digest(runtime_zip)=='7af18e85a1537b832924ae3b0e5146602f2f4b0c77c74e4ae0dc251ca338f9'
runtime_names=[]
with zipfile.ZipFile(runtime_zip) as z:
 for n in z.namelist():
  if n.endswith('/') or n.startswith('resources/'):continue
  dest='SENZ-STUDIO.exe' if n=='electron.exe' else n
  target=root/dest;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(n));runtime_names.append(dest)

cairosvg.svg2png(url=str(src/'assets/icon.svg'),write_to=str(src/'assets/icon.png'),output_width=256,output_height=256)
Image.open(src/'assets/icon.png').save(src/'assets/icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
tube=app/'tube';tube.mkdir();(tube/'assets').mkdir()
files=['package.json','main.cjs','tube-main.cjs','preload.cjs','policy.cjs','updater.cjs','index.html','ui.js','ui.css','assets/icon.svg','assets/icon.png','assets/icon.ico']
for n in files:shutil.copy2(src/n,tube/n)
names=['tube/'+n for n in files]
for f in (Path(__file__).parent/'files').iterdir():shutil.copy2(f,dist/f.name);names.append('dist/'+f.name)
shutil.copy2(src/'assets/icon.svg',dist/'tube-icon.svg');names.append('dist/tube-icon.svg')
p=app/'main.cjs';s=p.read_text();anchor="const validSender=event=>validOrigin(event)&&licenseStatus().active;";assert s.count(anchor)==1
s=s.replace(anchor,anchor+"\nconst tubeApp=require('./tube/tube-main.cjs').install({electron:require('electron'),integrated:true});\nipcMain.handle('tube-open',async event=>{if(!validSender(event))throw Error('Invalid request');await tubeApp.open();return true;});")
p.write_text(s);names.append('main.cjs')
p=app/'preload.cjs';s=p.read_text();anchor="contextBridge.exposeInMainWorld('senzDesktop',{";assert s.count(anchor)==1;p.write_text(s.replace(anchor,anchor+"\n tube:()=>ipcRenderer.invoke('tube-open'),"));names.append('preload.cjs')
p=dist/'app.js';s=p.read_text();p.write_text("import {installTubeLauncher} from './tube-launcher.js';\n"+s+"\ninstallTubeLauncher();\n")
for n in ['package.json','dist/app.js','dist/index.html']:
 p=app/n;s=p.read_text();assert '2.9.184' in s;p.write_text(s.replace('2.9.184','2.9.185'));names.append(n)
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.185'
 for n in names:d['files'][n]=digest(app/n)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<=set(runtime_names)|{'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload185.json').write_text(json.dumps(after))
# Standalone runtime is the same verified Electron runtime used by Studio.
standalone=Path('tube-payload');shutil.copytree(root,standalone,ignore=lambda p,n:['resources'] if Path(p)==root else [])
(standalone/'SENZ-STUDIO.exe').rename(standalone/'SENZ-TUBE.exe');(standalone/'resources').mkdir();shutil.copytree(tube,standalone/'resources/app')
Path('tube-payload.json').write_text(json.dumps({p.relative_to(standalone).as_posix():digest(p) for p in standalone.rglob('*') if p.is_file()}))
