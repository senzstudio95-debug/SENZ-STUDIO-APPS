from pathlib import Path
import hashlib,json,subprocess,shutil
import cairosvg
from PIL import Image
root=Path('payload');app=root/'resources/app';dist=app/'dist';src=Path('apps/senz-tube')
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.185.exe')
assert digest(base)=='6b72b6f6a0c27b17f1d35f6a5899d2bb33616981d3bda91a0d3c3c8965c41896'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.185'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
cairosvg.svg2png(url=str(src/'assets/icon.svg'),write_to=str(src/'assets/icon.png'),output_width=256,output_height=256)
Image.open(src/'assets/icon.png').save(src/'assets/icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
tube=app/'tube'
files=['package.json','main.cjs','tube-main.cjs','preload.cjs','policy.cjs','updater.cjs','adblock.cjs','index.html','ui.js','ui.css','assets/icon.svg','assets/icon.png','assets/icon.ico']
for n in files:shutil.copy2(src/n,tube/n)
names=['tube/'+n for n in files]
for folder,target,prefix in [('files',dist,'dist/'),('app-files',app,'')]:
 for f in (Path(__file__).parent/folder).iterdir():shutil.copy2(f,target/f.name);names.append(prefix+f.name)
p=dist/'index.html';s=p.read_text();assert '</head>' in s;p.write_text(s.replace('</head>','<link rel="stylesheet" href="display-fit.css"></head>'))
for n in ['package.json','dist/app.js','dist/index.html']:
 p=app/n;s=p.read_text();assert '2.9.185' in s;p.write_text(s.replace('2.9.185','2.9.186'));names.append(n)
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.186'
 for n in names:d['files'][n]=digest(app/n)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload186.json').write_text(json.dumps(after))
standalone=Path('tube-payload');shutil.copytree(root,standalone,ignore=lambda p,n:['resources'] if Path(p)==root else [])
(standalone/'SENZ-STUDIO.exe').rename(standalone/'SENZ-TUBE.exe');(standalone/'resources').mkdir();shutil.copytree(tube,standalone/'resources/app')
Path('tube-payload.json').write_text(json.dumps({p.relative_to(standalone).as_posix():digest(p) for p in standalone.rglob('*') if p.is_file()}))
