from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.190.exe')
assert digest(base)=='4b241bca00e7925abd2c69c57996b302baac081ee319f2150967d3b9a19f391d'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=[]
for src,dst in [('integrations/tiktok/studio-orders.js','dist/studio-orders.js'),('integrations/tiktok/native.cjs','tiktok-native.cjs'),('services/tiktok-connector/public/portal.js','dist/tiktok-portal.js'),('services/tiktok-connector/public/style.css','dist/tiktok-portal.css')]:shutil.copy2(src,app/dst);names.append(dst)
s=Path('services/tiktok-connector/public/index.html').read_text();s=s[s.index('<main>'):s.index('</main>')+7];write(dist/'tiktok-portal.html',s);names.append('dist/tiktok-portal.html')
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.190' in s;write(p,s.replace('2.9.190','2.9.191'));names.append(name)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.191'
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload191.json').write_text(json.dumps(after));print('TikTok integration patched; unrelated files unchanged')
