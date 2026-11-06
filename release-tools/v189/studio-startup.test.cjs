const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {_electron}=require('../../apps/senz-tube/node_modules/playwright');
const appDir=path.resolve(process.argv[2]),temp=fs.mkdtempSync(path.join(os.tmpdir(),'senz-full-start-'));
const fixture=path.join(temp,'main.cjs'),errors=path.join(temp,'errors.txt');
fs.writeFileSync(fixture,`const e=require('electron'),fs=require('fs');e.app.setPath('userData',${JSON.stringify(path.join(temp,'profile'))});e.dialog.showErrorBox=(title,message)=>{fs.appendFileSync(${JSON.stringify(errors)},title+'\\n'+message+'\\n');e.app.exit(91);};require(${JSON.stringify(path.join(appDir,'bootstrap.cjs'))});`);
let running;const watchdog=setTimeout(()=>{console.error('Full Studio test exceeded 120 seconds');running?.process().kill();process.exit(1);},120000);
(async()=>{let app;try{
 app=await _electron.launch({executablePath:require('../../apps/senz-tube/node_modules/electron'),args:['--no-sandbox',fixture],timeout:60000});
 app.process().stdout?.on('data',d=>process.stdout.write(d));app.process().stderr?.on('data',d=>process.stderr.write(d));
 running=app;let ready=false;
 for(let i=0;i<120;i++){
  if(fs.existsSync(errors))throw Error(fs.readFileSync(errors,'utf8'));
  ready=await app.evaluate(async({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('senz://app/index.html'));return !!w&&w.isVisible()&&await w.webContents.executeJavaScript("document.readyState==='complete'&&!!document.querySelector('canvas')");});
  if(ready)break;await new Promise(r=>setTimeout(r,500));
 }
 assert.ok(ready,'Real Studio editor loaded and visible after splash');
 assert.equal(fs.existsSync(errors),false,'No main-process startup errors');
 await app.evaluate(({app})=>{global.__secondLaunch=false;app.on('second-instance',()=>{global.__secondLaunch=true;});});
 const child=spawn(require('../../apps/senz-tube/node_modules/electron'),['--no-sandbox',fixture],{stdio:'ignore'});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Second instance did not exit'));},20000);child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);resolve();});});
 assert.equal(await app.evaluate(()=>global.__secondLaunch),true,'Second launch reached the initialized primary process');
 assert.equal(fs.existsSync(errors),false,'Second launch causes no desktopLayout error');
 fs.mkdirSync('apps/senz-tube/ui-artifacts',{recursive:true});const png=await app.evaluate(async({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('senz://app/index.html'));return (await w.webContents.capturePage()).toPNG().toString('base64');});fs.writeFileSync('apps/senz-tube/ui-artifacts/full-studio-startup.png',Buffer.from(png,'base64'));
 console.log('FULL STUDIO STARTUP PASSED: real bootstrap, all services, editor, splash, second-instance activation');
 }finally{if(fs.existsSync(errors))console.error(fs.readFileSync(errors,'utf8'));clearTimeout(watchdog);if(app)app.process().kill();try{fs.rmSync(temp,{recursive:true,force:true});}catch{}}})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
