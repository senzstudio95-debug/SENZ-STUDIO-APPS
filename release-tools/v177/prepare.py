from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.176.exe')
assert digest(base)=='c5f1d227c9812eb6b6442b89c7752782d449cf111e68d46b02f2c112745ba82c'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.176'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
for f in (Path(__file__).parent/'files').iterdir():shutil.copy2(f,dist/f.name)
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text();assert '2.9.176' in s;p.write_text(s.replace('2.9.176','2.9.177'))
names=['package.json','dist/app.js','dist/index.html','dist/size-tool.js']
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.177'
 for name in names:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload177.json').write_text(json.dumps(after))
