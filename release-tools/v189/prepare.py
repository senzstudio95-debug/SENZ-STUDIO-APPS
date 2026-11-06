from pathlib import Path
import hashlib,json,subprocess,shutil
def write(p,s):p.write_bytes(s.encode('utf-8'))
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.185.exe')
assert digest(base)=='6b72b6f6a0c27b17f1d35f6a5899d2bb33616981d3bda91a0d3c3c8965c41896'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True);shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text(encoding='utf-8'))['version']=='2.9.185'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
names=[]
for p in (Path(__file__).parent/'files').iterdir():shutil.copy2(p,dist/p.name);names.append('dist/'+p.name)
p=dist/'compact-workspace.js';s=p.read_text(encoding='utf-8');old='const height=strip.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);';new="const height=strip.offsetHeight-(parseFloat(css.borderTopWidth)||0)-(parseFloat(css.borderBottomWidth)||0)-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-12;";assert s.count(old)==1;s=s.replace(old,new);assert 'Math.min(1.5,height/82)' in s;s=s.replace('Math.min(1.5,height/82)','Math.min(1.5,(height-4)/82)');write(p,s);names.append('dist/compact-workspace.js')
p=dist/'quick-dock.js';s=p.read_text(encoding='utf-8');a=s.index('child.animate(next?');b=s.index(';',a);s=s[:a]+"child.animate(next?[{opacity:1},{opacity:0}]:[{opacity:0},{opacity:1}],{duration:180,easing:'linear'})"+s[b:];write(p,s);names.append('dist/quick-dock.js')
p=dist/'index.html';s=p.read_text(encoding='utf-8');assert '</head>' in s;s=s.replace('</head>','<link rel="stylesheet" href="arrange-compact.css"><script type="module" src="arrange-window-size.js"></script></head>');write(p,s)
for n in ['package.json','dist/app.js','dist/index.html']:
 p=app/n;s=p.read_text(encoding='utf-8');assert '2.9.185' in s;write(p,s.replace('2.9.185','2.9.189'));names.append(n)
p=app/'SOURCE-SHA256.json'
if p.exists():
 d=json.loads(p.read_text(encoding='utf-8'));d['version']='2.9.189'
 for n in names:d['files'][n]=digest(app/n)
 write(p,json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert set(before)<=set(after)
changed={n for n in after if before.get(n)!=after[n]}
assert changed<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
assert before['resources/app/main.cjs']==after['resources/app/main.cjs']
assert all(after[n]==sha for n,sha in before.items() if n.startswith('resources/app/tube/'))
Path('payload189.json').write_text(json.dumps(after))
print('Only requested UI files and version metadata changed:',sorted(changed))
