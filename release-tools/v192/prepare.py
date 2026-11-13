from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def write(p,s):p.write_bytes(s.encode('utf-8'))
base=Path('SENZ-STUDIO-UPDATE-v2.9.191.exe')
assert digest(base)=='d41a39b071a2cd2c002f3f1c15048d24ae8c09dc40c2058e27079f76cbb0bc60'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=[];source=Path('integrations/senzreader')
for src,dst in [('studio-orders.js','dist/studio-orders.js'),('tiktok-native.cjs','tiktok-native.cjs'),('reader-bridge.cjs','reader-bridge.cjs')]:
 shutil.copy2(source/'Studio-Bridge/files'/src,app/dst);names.append(dst)
for p in (source/'SENZ-Reader').iterdir():
 if not p.is_file():continue
 dest=app/'reader-extension'/p.name;dest.parent.mkdir(exist_ok=True);shutil.copy2(p,dest);names.append(dest.relative_to(app).as_posix())
p=app/'dist/app.js';s=p.read_text(encoding='utf-8');old='installTikTokOrders({editor,fonts:()=>fonts,ensureFont,toast});'
assert s.count(old)==1 and 'confirm-delete-font' in s
s=s.replace(old,"installTikTokOrders({editor,fonts:()=>fonts,ensureFont,toast,uploadFonts,fontPrefs:()=>fontPrefs,removeFont:family=>actions['confirm-delete-font'](family)});");write(p,s)
p=app/'preload.cjs';s=p.read_text(encoding='utf-8');needle=" tiktokOpen:url=>ipcRenderer.invoke('senz-tiktok-open',url),"
assert s.count(needle)==1 and 'readerConfig:' not in s
addition=""" readerConfig:()=>ipcRenderer.invoke('senz-reader-config'),
 readerTake:()=>ipcRenderer.invoke('senz-reader-take'),
 readerResult:data=>ipcRenderer.invoke('senz-reader-result',data),
 readerReview:data=>ipcRenderer.invoke('senz-reader-review',data),
 readerInstallPlugin:()=>ipcRenderer.invoke('senz-reader-install-plugin'),
"""
write(p,s.replace(needle,addition+needle));names.append('preload.cjs')
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.191' in s;write(p,s.replace('2.9.191','2.9.192'));names.append(name)
p=app/'SOURCE-SHA256.json';d=json.loads(p.read_text());d['version']='2.9.192'
for name in names:d['files'][name]=digest(app/name)
write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload192.json').write_text(json.dumps(after));print('SENZREADER integrated; all unrelated files unchanged')
