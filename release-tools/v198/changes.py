from pathlib import Path
import re,json

def patch(app):
 names=[]
 def edit(name,fn):
  p=app/name;s=p.read_text(encoding='utf-8');out=fn(s)
  assert out!=s,name
  p.write_bytes(out.encode());names.append(name)
 def sub(s,a,b):
  assert a in s,a
  return s.replace(a,b)
 edit('dist/index.html',lambda s:re.sub(r'^.*<button class="tool" data-vector-eraser.*\n','',s.replace('SENZ STUDIO','SENZ STUDIO PRO'),flags=re.M))
 for name in ['dist/studio-orders.js','reader-extension/studio-bridge.js','reader-extension/background.js','reader-extension/reader.js','reader-extension/reader.html']:
  edit(name,lambda s: s.replace('SENZREADER','Order Pro').replace('SENZ Order Reader','Order Pro').replace('SENZ Reader','Order Pro').replace('ORDER READER','Order Pro').replace('SENZ Studio','SENZ STUDIO PRO').replace('SENZ STUDIO</','SENZ STUDIO PRO</'))
 edit('reader-extension/manifest.json',lambda s:s.replace('SENZ Order Reader','Order Pro'))
 edit('package.json',lambda s:s.replace('"productName": "SENZ STUDIO"','"productName": "SENZ STUDIO PRO"'))
 # Retain the internal Electron name, app ID and profile location: existing settings and fonts stay available.
 edit('main.cjs',lambda s:s.replace('SENZ STUDIO','SENZ STUDIO PRO').replace("app.setName('SENZ STUDIO PRO');","app.setName('SENZ STUDIO');"))
 for name in ['installer/ui.js','dist/splash.html','project-association.cjs']:
  edit(name,lambda s:s.replace('SENZ STUDIO','SENZ STUDIO PRO'))
 # Keep installed folder names and executable paths compatible with the updater.
 edit('installer-main.cjs',lambda s:s.replace("'SENZ STUDIO update'","'SENZ STUDIO PRO update'").replace("'SENZ STUDIO.lnk'","'SENZ STUDIO PRO.lnk'"))
 def work(s):
  for a,b in [(',eraseModel,brushPolygons', ''),(',deleteNode',''),("delete:['Delete Anchor Point','−','−'],",''),("const pen=document.querySelector('[data-vector-pen]'),eraser=document.querySelector('[data-vector-eraser]');","const pen=document.querySelector('[data-vector-pen]');")]:s=sub(s,a,b)
  s=re.sub(r'^ function options\(\).*$', ''' function options(){bar.hidden=!mode;if(!mode)return;bar.innerHTML=`<div class="vector-options-head"><strong>${TOOLS[mode][0]}</strong><button data-vector-command="exit" title="Selection (V)">×</button></div><div class="vector-options-controls"><label>Colour <input type="color" data-vector-setting="color" value="${settings.color}" aria-label="Pen colour"></label><label>Stroke <input data-vector-setting="width" type="number" min="0.05" max="20" step="0.1" value="${settings.width}" aria-label="Pen stroke in millimetres"> mm</label><label><input type="checkbox" data-vector-setting="fill" ${settings.fill?'checked':''}> Fill closed path</label><button data-vector-command="finish">Finish path ↵</button><button data-vector-command="unite" title="Unite selected solid vectors">Unite</button></div><small>${mode==='pen'?'Click for corners, drag for curves • Click first node to close • Enter finish • Hover a path +':mode==='anchor'?'Click node: corner ↔ curve • Drag node: handles • Ctrl-drag: move node • Alt-drag: independent handle':'Click a path to select it, then click its curve • Ctrl+Z Undo'}</small>`;}''',s,flags=re.M)
  s=re.sub(r'^ (?:if\(gesture\?\.type===\x27erase\x27\)|if\(mode===\x27erase\x27&&lastPoint\)|function remove\(|async function erase\().*\n','',s,flags=re.M)
  for a,b in [("if(model&&mode!=='erase')","if(model)"),("if(hover&&mode==='pen'&&!draft)","if(hover?.kind==='segment'&&mode==='pen'&&!draft)"),("${hover.kind==='node'?'−':'+'}",'+'),("function setMode(next){if(busy)return;","function setMode(next){if(busy||(next&&!Object.hasOwn(TOOLS,next)))return;"),("mode==='erase'?'none':mode?'crosshair':''","mode?'crosshair':''"),("eraser.classList.toggle('active',mode==='erase'||mode==='node-erase');",''),("if(mode&&mode!=='erase'&&editable(editor.selected))","if(mode&&editable(editor.selected))"),("if(o&&mode!=='erase')","if(o&&mode)"), ("if(h.kind==='node'&&['delete','node-erase','pen'].includes(mode)){remove(h);return;}",''),("if(gesture.type==='erase'){if(distance(gesture.points.at(-1),p)>.5/editor.zoom)gesture.points.push(p);}else if(gesture.type==='draft')","if(gesture.type==='draft')"),("if(g.type==='erase')void erase(g);else if(g.type==='anchor')","if(g.type==='anchor')"),("eraser.addEventListener('click',e=>{e.preventDefault();setMode('erase');},true);",''),("if(c==='brush')setMode('erase');if(c==='nodes')setMode('node-erase');",''),("[data-vector-pen],[data-vector-eraser]","[data-vector-pen]"),("k==='e'?'erase':k==='p'?'pen'","k==='p'?'pen'"),(":e.key==='-'||e.code==='NumpadSubtract'?'delete':null",':null'),("if(mode==='erase'&&['[',']'].includes(e.key)){consume(e);settings.size=Math.min(150,Math.max(.2,Math.round(settings.size*(e.key==='['?.8:1.25)*10)/10));save();options();draw();return;}",'')]:s=sub(s,a,b)
  s=re.sub(r'^ if\(mode===\x27erase\x27\).*\n else if\(draft\)', ' if(draft)',s,flags=re.M)
  assert not any(x in s for x in ['Delete Anchor Point','Vector Eraser',"'erase'","'node-erase'",'remove(h)','deleteNode'])
  return s
 edit('dist/vector-workbench.js',work)
 def toolbar(s):
  s=sub(s,"const entries=buttons.map((button,i)=>{","const entries=buttons.map((button,index)=>{const i=button.hasAttribute('data-vector-pen')?8:button.hasAttribute('data-pathfinder')?9:index;")
  s=sub(s,'return {button,slot,label:', 'return {id:String(i),button,slot,label:')
  return sub(s,"'Vector Eraser'",'null')
 edit('dist/toolbar-customize.js',toolbar)
 for name in ['dist/toolbar-glass.js','dist/side-toolbar.js']:
  edit(name,lambda s:s.replace("||b.hasAttribute('data-vector-eraser')",'').replace("||button.hasAttribute('data-vector-eraser')",''))
 for name in ['package.json','dist/app.js','dist/index.html']:
  p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.197' in s;p.write_bytes(s.replace('2.9.197','2.9.198').encode());names.append(name)
 return sorted(set(names))
