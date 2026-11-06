from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.174.exe')
assert digest(base)=='31ce41ce1d13b76b2c94a09215e35b7171a07ebdcf9b8a6f9cb3ffd1fb1064fd'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.174'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
def patch(name,old,new):
 p=dist/name;s=p.read_text();assert s.count(old)==1,(name,old,s.count(old));p.write_text(s.replace(old,new))
p=dist/'app.js';p.write_text("import {shapeDefaults,shapeControls,installShapeControls} from './shape-controls.js';\n"+p.read_text())
patch('app.js','installCanvasInteractions({editor,actions,windows,guides});','installCanvasInteractions({editor,actions,windows,guides});installShapeControls(editor);')
patch('app.js',"if(tool==='shape')html+=`<div", "if(tool==='shape')html+=shapeControls+`<div")
patch('app.js',"type:'shape',shape,color:$('#object-color').value", "type:'shape',shape,...shapeDefaults,color:$('#object-color').value")
patch('app.js','Z: Zoom tool, drag right/left · V / Esc: exit zoom','Z: drag right/left to zoom; release returns to Move')
patch('index.html','Zoom tool (Z) · drag right to zoom in, left to zoom out','Zoom (Z) · drag right/left; release returns to Move')
p=dist/'focus-mode.css';p.write_text(p.read_text()+'\n/* Keep the six app shortcuts out of Focus Mode only. */\nbody.focus-mode .focus-quick :is(.buddy-toggle,.namae-toggle,.signature-toggle,.remover-toggle,.remote-toggle,.senz-store-toggle){display:none!important}\n')
for f in (Path(__file__).parent/'files').iterdir():shutil.copy2(f,dist/f.name)
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text();assert '2.9.174' in s;p.write_text(s.replace('2.9.174','2.9.175'))
names=['package.json','dist/app.js','dist/index.html','dist/focus-mode.css','dist/canvas-interactions.js','dist/shape-controls.js']
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.175'
 for name in names:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<={'resources/app/'+n for n in names+['SOURCE-SHA256.json']}
Path('payload175.json').write_text(json.dumps(after))
print('Only zoom, shape controls, focus shortcut visibility and version metadata changed.')
