from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.178.exe')
assert digest(base)=='b2103d81548f7366e0cdfe88526c89e4401501028e573ee218cb6cbec8d086b4'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.178'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
for f in (Path(__file__).parent/'files').iterdir():shutil.copy2(f,dist/f.name)
for f in (Path(__file__).parent/'app-files').iterdir():shutil.copy2(f,app/f.name)
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text();assert '2.9.178' in s;p.write_text(s.replace('2.9.178','2.9.179'))
names=['package.json','dist/app.js','dist/index.html','dist/auto-arrange.js','dist/arrange-layout.js','dist/auto-arrange.css','update-core.cjs','download-ranges.cjs']
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.179'
 for name in names:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload179.json').write_text(json.dumps(after))

