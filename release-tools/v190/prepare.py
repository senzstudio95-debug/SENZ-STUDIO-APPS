from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.189.exe')
assert digest(base)=='4b1ca4ee745ac6d316aaad6e66038ed44017ffa5c05a9255dfd84c82288f596c'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=[]
for src,dst in [('integrations/tiktok/studio-orders.js','dist/studio-orders.js'),('integrations/tiktok/native.cjs','tiktok-native.cjs'),('services/tiktok-connector/public/portal.js','dist/tiktok-portal.js'),('services/tiktok-connector/public/style.css','dist/tiktok-portal.css')]:shutil.copy2(src,app/dst);names.append(dst)
s=Path('services/tiktok-connector/public/index.html').read_text();s=s[s.index('<main>'):s.index('</main>')+7];write(dist/'tiktok-portal.html',s);names.append('dist/tiktok-portal.html')
p=dist/'app.js';s=p.read_text(encoding='utf-8');needle='installAutoArrange({editor,actions,fonts:()=>fonts,toast});';assert s.count(needle)==1;s=s.replace(needle,needle+'installTikTokOrders({editor,fonts:()=>fonts,ensureFont,toast});');s="import {installTikTokOrders} from './studio-orders.js';\n"+s;write(p,s)
p=app/'main.cjs';s=p.read_text(encoding='utf-8');s+="\nrequire('./tiktok-native.cjs').install();\n";write(p,s);names.append('main.cjs')
p=app/'preload.cjs';s=p.read_text(encoding='utf-8');needle=" tube:()=>ipcRenderer.invoke('tube-open'),";assert s.count(needle)==1;s=s.replace(needle," tiktokOpen:url=>ipcRenderer.invoke('senz-tiktok-open',url),\n"+needle);write(p,s);names.append('preload.cjs')
p=dist/'index.html';s=p.read_text(encoding='utf-8');needle="connect-src 'self' data: blob:;";assert s.count(needle)==1;s=s.replace(needle,"connect-src 'self' data: blob: https://senz-tiktok-production.up.railway.app;");write(p,s)
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.189' in s;write(p,s.replace('2.9.189','2.9.190'));names.append(name)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.190'
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload190.json').write_text(json.dumps(after));print('TikTok integration patched; unrelated files unchanged')
