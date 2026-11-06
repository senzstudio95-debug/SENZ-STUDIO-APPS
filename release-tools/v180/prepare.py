from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.179.exe')
assert digest(base)=='1bf9ad3954dab9c7cd082d91f6ea7c50bc8fbefa3fdd1b7a6479622852a5a659'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.179'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
exec((Path(__file__).parent/'patch.py').read_text())
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text();assert '2.9.179' in s;p.write_text(s.replace('2.9.179','2.9.180'))
names=['package.json','dist/app.js','dist/index.html','dist/editor.js','dist/core.js','dist/vector-cache.js','dist/vector-box.js','dist/object-transform.js','dist/focus-mode.js','dist/quick-text-controls.js','dist/render-cache.js']
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.180'
 for name in names:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload180.json').write_text(json.dumps(after))

