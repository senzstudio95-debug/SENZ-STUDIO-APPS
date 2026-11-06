from pathlib import Path
import hashlib,json,subprocess,shutil
import cairosvg
from PIL import Image
root=Path('payload');app=root/'resources/app';dist=app/'dist';src=Path('apps/senz-tube')
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.187.exe')
assert digest(base)=='d6f87e51356ed34eb5acf1de68e4ed43b1820740eca1ff50e202749a8d32831a'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.187'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
cairosvg.svg2png(url=str(src/'assets/icon.svg'),write_to=str(src/'assets/icon.png'),output_width=256,output_height=256)
Image.open(src/'assets/icon.png').save(src/'assets/icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
tube=app/'tube'
files=['package.json','main.cjs','tube-main.cjs','preload.cjs','policy.cjs','updater.cjs','index.html','ui.js','ui.css','assets/icon.svg','assets/icon.png','assets/icon.ico']
for n in files:shutil.copy2(src/n,tube/n)
names=['tube/'+n for n in files]
subprocess.run(['python3','release-tools/v188/patch-startup.py',str(app)],check=True)
names+=['main.cjs','bootstrap.cjs']
(tube/'adblock.cjs').unlink(missing_ok=True)
for n in ['package.json','dist/app.js','dist/index.html']:
 p=app/n;s=p.read_text();assert '2.9.187' in s;p.write_text(s.replace('2.9.187','2.9.188'));names.append(n)
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.188'
 d['files'].pop('tube/adblock.cjs',None)
 for n in names:d['files'][n]=digest(app/n)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)-set(after)=={'resources/app/tube/adblock.cjs'}
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload188.json').write_text(json.dumps(after))
standalone=Path('tube-payload');shutil.copytree(root,standalone,ignore=lambda p,n:['resources'] if Path(p)==root else [])
(standalone/'SENZ-STUDIO.exe').rename(standalone/'SENZ-TUBE.exe');(standalone/'resources').mkdir();shutil.copytree(tube,standalone/'resources/app')
Path('tube-payload.json').write_text(json.dumps({p.relative_to(standalone).as_posix():digest(p) for p in standalone.rglob('*') if p.is_file()}))
