from pathlib import Path
import shutil

def patch(app):
 names=[]
 def edit(name,old,new):
  p=app/name;s=p.read_text(encoding='utf-8');assert old in s,name;p.write_bytes(s.replace(old,new).encode());names.append(name)
 assets=Path(__file__).with_name('assets')
 for source in assets.iterdir():
  shutil.copy2(source,app/'dist'/source.name);names.append('dist/'+source.name)
 # Keep the old pure sprite helper exports for compatibility, switch only its entry point.
 edit('dist/buddy-avatar.js',"import {installRenderer} from './buddy-renderer.js';","import {install3DRenderer as installRenderer} from './buddy-3d.js';")
 edit('dist/buddy.js','Animations / 8 Views','3D Animations')
 edit('dist/buddy.js','All 64 Poses','3D Motion Demo')
 edit('main.cjs','void dsApp.close().catch(()=>{});','')
 for name in ['package.json','dist/app.js','dist/index.html']:edit(name,'2.9.201','2.9.202')
 # Toolbar shows the same supplied character, while the main and minimized Buddy render in 3D.
 shutil.copy2(assets/'buddy-3d-poster.png',app/'dist/buddy-button.png');names.append('dist/buddy-button.png')
 return names,[]
