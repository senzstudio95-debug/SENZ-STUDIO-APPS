from pathlib import Path
import hashlib,subprocess,shutil,json,zipfile
base=Path('SENZ-STUDIO-UPDATE-v2.9.200.exe')
def sha(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
assert sha(base)=='35e8a3d15c1cee3aa9d06c5b3eaf29674643ada086678301fb65940fcdd15319'
subprocess.run(['7z','x','-y',str(base),'-obase'],check=True)
shutil.move('base/$PLUGINSDIR/payload','payload')
def inventory(root):return {p.relative_to(root).as_posix():sha(p) for p in root.rglob('*') if p.is_file()}
before=inventory(Path('payload'))
subprocess.run(['makensis','release-tools/compact200/installer.nsi'],check=True)
exe=Path('SENZ-STUDIO-COMPACT-v2.9.200.exe')
subprocess.run(['7z','t',str(exe)],check=True)
subprocess.run(['7z','x','-y',str(exe),'-overify'],check=True)
assert inventory(Path('verify/$PLUGINSDIR/payload'))==before,'Repacked installer files differ'
assert exe.stat().st_size<base.stat().st_size,'No compression improvement'
target=399_000_000
report={'version':'2.9.200','original_bytes':base.stat().st_size,'compact_exe_bytes':exe.stat().st_size,'target_bytes':target,'verified_files':len(before),'all_application_files_unchanged':True,'exe_sha256':sha(exe)}
files=[exe]
readme='SENZ STUDIO PRO v2.9.200\n\nRun SENZ-STUDIO-COMPACT-v2.9.200.exe to install.\nEvery application file matches the original v2.9.200 installer.\nOnly the installer compression changed from zlib to solid LZMA.\n\nThis ZIP is exactly 399,000,000 bytes (399 decimal MB).\nsize-padding.bin is inert padding solely to meet the requested exact ZIP size.\nIt is not needed for installation and can be deleted after extraction.\nThe compact EXE is smaller and is also available as a separate download.\nWindows may display decimal MB differently (399 MB is approximately 380.52 MiB).\n'
archive=Path('SENZ-STUDIO-PRO-v2.9.200-399MB.zip')
def make_zip(padding):
 with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED) as z:
  z.write(exe,exe.name)
  z.writestr('README.txt',readme)
  with z.open('size-padding.bin','w') as entry:
   chunk=bytes(1024*1024)
   while padding:
    n=min(padding,len(chunk));entry.write(chunk[:n]);padding-=n
make_zip(0)
gap=target-archive.stat().st_size
if gap>=0:
 make_zip(gap)
 assert archive.stat().st_size==target
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  with z.open(exe.name) as f:assert hashlib.file_digest(f,'sha256').hexdigest()==sha(exe)
 report['exact_zip_bytes']=archive.stat().st_size;report['padding_bytes']=gap;files.append(archive)
else:
 archive.unlink();report['exact_zip_possible']=False
Path('COMPACT-SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.name+'\n' for p in files))
Path('COMPACT-REPORT.json').write_text(json.dumps(report,indent=2)+'\n')
print('COMPRESSION RESULT:',json.dumps(report))
