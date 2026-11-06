const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {_electron}=require('../../apps/senz-tube/node_modules/playwright');
const appDir=path.resolve(process.argv[2]),temp=fs.mkdtempSync(path.join(os.tmpdir(),'senz-full-start-'));
const fixture=path.join(temp,'main.cjs'),errors=path.join(temp,'errors.txt');
fs.writeFileSync(fixture,`const e=require('electron'),fs=require('fs');e.app.setPath('userData',${JSON.stringify(path.join(temp,'profile'))});e.dialog.showErrorBox=(title,message)=>{fs.appendFileSync(${JSON.stringify(errors)},title+'\\n'+message+'\\n');e.app.exit(91);};require(${JSON.stringify(path.join(appDir,'bootstrap.cjs'))});`);
(async()=>{let app;try{
 app=await _electron.launch({executablePath:require('../../apps/senz-tube/node_modules/electron'),args:['--no-sandbox',fixture],timeout:60000});
 app.process().stdout?.on('data',d=>process.stdout.write(d));app.process().stderr?.on('data',d=>process.stderr.write(d));
 let editor;for(let i=0;i<120;i++){editor=app.windows().find(w=>w.url().startsWith('senz://app/index.html'));if(editor)break;if(fs.existsSync(errors))throw Error(fs.readFileSync(errors,'utf8'));await new Promise(r=>setTimeout(r,500));}
 if(!editor){console.log('Window URLs',app.windows().map(w=>w.url()));console.log('Native windows',await app.evaluate(({app,BrowserWindow})=>({ready:app.isReady(),argv:process.argv,windows:BrowserWindow.getAllWindows().map(w=>({url:w.webContents.getURL(),visible:w.isVisible(),title:w.getTitle()}))})));fs.mkdirSync('apps/senz-tube/ui-artifacts',{recursive:true});let i=0;for(const w of app.windows())await w.screenshot({path:'apps/senz-tube/ui-artifacts/studio-failure-'+i+++'.png'}).catch(()=>{});}
 assert.ok(editor,'Full Studio editor window opened');
 await editor.waitForFunction(()=>document.readyState==='complete'&&!!document.querySelector('canvas'),{timeout:60000});
 for(let i=0;i<60;i++){if(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.webContents.getURL().startsWith('senz://app/index.html')&&w.isVisible())))break;await new Promise(r=>setTimeout(r,250));}
 assert.ok(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.webContents.getURL().startsWith('senz://app/index.html')&&w.isVisible())),'Editor revealed after splash');
 assert.equal(fs.existsSync(errors),false,'No main-process startup errors');
 await app.evaluate(({app})=>{global.__secondLaunch=false;app.on('second-instance',()=>{global.__secondLaunch=true;});});
 const child=spawn(require('../../apps/senz-tube/node_modules/electron'),['--no-sandbox',fixture],{stdio:'ignore'});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Second instance did not exit'));},20000);child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);resolve();});});
 assert.equal(await app.evaluate(()=>global.__secondLaunch),true,'Second launch reached the initialized primary process');
 assert.equal(fs.existsSync(errors),false,'Second launch causes no desktopLayout error');
 fs.mkdirSync('apps/senz-tube/ui-artifacts',{recursive:true});await editor.screenshot({path:'apps/senz-tube/ui-artifacts/full-studio-startup.png'});
 console.log('FULL STUDIO STARTUP PASSED: real bootstrap, all services, editor, splash, second-instance activation');
 }finally{if(fs.existsSync(errors))console.error(fs.readFileSync(errors,'utf8'));if(app)await app.close();fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exit(1);});
