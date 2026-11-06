from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.175.exe')
assert digest(base)=='c4b7dabcbe92e6195b535291ec2a0788f59834da624cb54c68f82540bcd8c4d3'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.175'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
p=dist/'app.js';s=p.read_text();s="import {installShapeDrag} from './shape-drag.js';\n"+s
needle='installShapeControls(editor);';assert s.count(needle)==1;s=s.replace(needle,needle+'installShapeDrag({editor,actions,closePanel:panelClose});')
s=s.replace('Drag a corner to resize. Hold Shift to keep proportions.','Choose a shape, then click and drag on canvas. Hold Shift for equal proportions. Esc cancels.');p.write_text(s)
for f in (Path(__file__).parent/'files').iterdir():shutil.copy2(f,dist/f.name)
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text();assert '2.9.175' in s;p.write_text(s.replace('2.9.175','2.9.176'))
names=['package.json','dist/app.js','dist/index.html','dist/shape-drag.js']
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.176'
 for name in names:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload176.json').write_text(json.dumps(after))
