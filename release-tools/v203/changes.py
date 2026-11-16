from pathlib import Path

def patch(app):
 names=['package.json','dist/app.js','dist/index.html']
 assert not list((app/'dist').glob('buddy-3d*')), 'Base must be pre-3D v201'
 assert "from './buddy-renderer.js'" in (app/'dist/buddy-avatar.js').read_text()
 for name in names:
  p=app/name;s=p.read_text(encoding='utf-8');assert '2.9.201' in s,name;p.write_bytes(s.replace('2.9.201','2.9.203').encode())
 return names,[]
