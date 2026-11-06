from pathlib import Path
import sys
app=Path(sys.argv[1]);p=app/'main.cjs';s=p.read_text()
# State exists before any service can register or trigger startup callbacks.
assert s.count('let desktopLayout=null;')==1
assert s.count('let focusTransition=false;')==1
s=s.replace('let desktopLayout=null;','').replace('let focusTransition=false;','')
anchor=' let launchReady=false,studioRequested='
assert s.count(anchor)==1
s=s.replace(anchor,' let desktopLayout=null,focusTransition=false;\n'+anchor)
# Register ready only after every synchronous service has successfully installed.
a=s.index(' app.whenReady().then(async()=>{');b=s.index(' function createStudioWindow(){',a)
ready=s[a:b];s=s[:a]+s[b:]
ready=ready.replace("dialog.showErrorBox('SENZ STUDIO',e.message);", "dialog.showErrorBox('SENZ STUDIO',e.message);app.exit(1);")
end='} // Only the primary process installs services and IPC handlers.'
assert s.count(end)==1;s=s.replace(end,ready+'\n'+end);p.write_text(s)
p=app/'bootstrap.cjs'
p.write_text("""try {
 if(process.argv.includes('--senz-installer'))require('./installer-main.cjs');else require('./main.cjs');
} catch(error) {
 console.error('SENZ initialization failed:',error);
 const {app,dialog}=require('electron');
 dialog.showErrorBox('SENZ STUDIO startup',String(error.stack||error));
 app.exit(1);
}
""")
print('Studio startup state and ready barrier patched:',app)
