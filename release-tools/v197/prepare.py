from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.196.exe')
assert digest(base)=='1bbdd120a9057d63aca3ff67a3fb3c40c713d381142bcca0ce801c57906b1328'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=['dist/reader-symbol-layout.js','dist/emoji-vector.js']
shutil.copy2('release-tools/v197/reader-symbol-layout.js',app/'dist/reader-symbol-layout.js')
p=app/'dist/emoji-vector.js';s=p.read_text(encoding='utf-8')
old='p.logoScale=p.px/Math.max(p.logo.width,p.logo.height);p.logoX=p.x+(p.px-p.logo.width*p.logoScale)/2;p.logoY=p.y+p.symbolTop+(p.px-p.logo.height*p.logoScale)/2;'
assert s.count(old)==1
write(p,s.replace(old,'p.logoScale=p.symbolScale;p.logoX=p.x;p.logoY=p.y+p.symbolTop;'))
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.196' in s;write(p,s.replace('2.9.196','2.9.197'));names.append(name)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.197'
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload197.json').write_text(json.dumps(after));print('SENZREADER integrated; all unrelated files unchanged')

