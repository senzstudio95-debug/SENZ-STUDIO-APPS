from pathlib import Path
import hashlib,json,subprocess,shutil
root=Path('payload');app=root/'resources/app';dist=app/'dist'
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
base=Path('SENZ-STUDIO-UPDATE-v2.9.173.exe')
assert digest(base)=='99096180930fa0ce1089f178c1ca99582c4cb4023aa7b2e9278dc0dfe7089167'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload',root)
assert json.loads((app/'package.json').read_text())['version']=='2.9.173'
before={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
Path('baseline174.json').write_text(json.dumps(before))
p=dist/'app.js';s=p.read_text()
assert "'zoom-tool'" not in s
s="import {installCanvasInteractions} from './canvas-interactions.js';\n"+s
s=s.replace("'zoom-in':'Ctrl+='","'zoom-tool':'z','zoom-in':'Ctrl+='",1)
assert s.count('guides=new CanvasGuides(editor);applyWorkspace();')==1
s=s.replace('guides=new CanvasGuides(editor);applyWorkspace();','guides=new CanvasGuides(editor);installCanvasInteractions({editor,actions,windows,guides});applyWorkspace();')
s=s.replace("['assets','Fonts / assets','.asset-dock']","['assets','Quick Font','.asset-dock']")
s=s.replace('Space+drag: pan</p>','Space+drag: pan · Z: Zoom tool, drag right/left · V / Esc: exit zoom</p>');p.write_text(s)
p=dist/'index.html';s=p.read_text().replace('</head>','<link rel="stylesheet" href="canvas-interactions.css">\n</head>')
needle='<button data-action="pan"';assert s.count(needle)==1
button='<button data-action="zoom-tool" class="soft" aria-pressed="false" title="Zoom tool (Z) · drag right to zoom in, left to zoom out" aria-label="Zoom tool (Z)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></button>'
p.write_text(s.replace(needle,button+needle,1))
p=dist/'quick-floating.js';s=p.read_text();assert "handles={font:'A'" in s;p.write_text(s.replace("handles={font:'A'","handles={font:'Quick Font'"))
for f in (Path(__file__).parent/'files').iterdir():shutil.copy2(f,dist/f.name)
for name in ['package.json','dist/app.js','dist/index.html']:
 p=app/name;s=p.read_text();assert '2.9.173' in s;p.write_text(s.replace('2.9.173','2.9.174'))
manifest=app/'SOURCE-SHA256.json'
if manifest.exists():
 d=json.loads(manifest.read_text());d['version']='2.9.174'
 for name in ['package.json','dist/app.js','dist/index.html','dist/quick-floating.js','dist/canvas-interactions.js','dist/canvas-interactions.css']:d['files'][name]=digest(app/name)
 manifest.write_text(json.dumps(d,indent=2)+'\n')
after={p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
allowed={'resources/app/'+n for n in ['package.json','dist/app.js','dist/index.html','dist/quick-floating.js','dist/canvas-interactions.js','dist/canvas-interactions.css','SOURCE-SHA256.json']}
assert all(n in after for n in before)
assert {n for n in after if before.get(n)!=after[n]}<=allowed
Path('payload174.json').write_text(json.dumps(after))
print('Only requested UI modules and version metadata changed.')
