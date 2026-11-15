from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.200.exe')
assert digest(base)=='35e8a3d15c1cee3aa9d06c5b3eaf29674643ada086678301fb65940fcdd15319'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
from changes import patch
names,removed=patch(app)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.201'
for name in removed:d['files'].pop(name,None)
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)-set(after)=={'resources/app/'+n for n in removed}
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload201.json').write_text(json.dumps(after));print('SENZREADER integrated; all unrelated files unchanged')


