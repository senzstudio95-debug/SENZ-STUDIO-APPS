const electron=require('electron'),assert=require('node:assert/strict');
assert.equal(electron.app.isReady(),false,'Regression fixture must install before ready');
electron.app.setPath('userData',process.env.SENZ_TUBE_PROFILE);
const tube=require('./tube-main.cjs').install({electron,integrated:true});
assert.equal(electron.app.isReady(),false);
assert.deepEqual(tube.inspect().state('main').adblock,{enabled:true,blocked:0});
global.__tube=tube;
electron.app.on('window-all-closed',()=>electron.app.quit());
void tube.open();
