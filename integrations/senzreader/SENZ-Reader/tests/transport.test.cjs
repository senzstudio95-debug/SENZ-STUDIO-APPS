const assert=require('node:assert/strict');const B=require('../studio-bridge.js');
(async()=>{global.fetch=async()=>({status:401,ok:false});await assert.rejects(()=>B.request('bad','/health'),/Pairing code/);
global.fetch=async()=>{throw new TypeError('Failed to fetch')};await assert.rejects(()=>B.request('token','/health'),/127.0.0.1:47831/);
global.fetch=async()=>({status:200,ok:true,json:async()=>({service:'senz-reader-bridge'})});assert.equal((await B.request('token','/health')).service,'senz-reader-bridge');
const fs=require('node:fs'),vm=require('node:vm');let listener,stored;
const context={importScripts(){},StudioBridge:{send:async()=>({status:'awaiting_review'})},chrome:{runtime:{id:'test-id',onMessage:{addListener:fn=>listener=fn}},storage:{local:{get:async()=>({studioToken:'secret'}),set:async x=>stored=x}}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../background.js','utf8'),context);
const response=await new Promise(resolve=>{assert.equal(listener({type:'senz-send',orders:[]},{id:'test-id'},resolve),true)});assert.equal(response.ok,true);assert.match(response.message,/ADD TO CANVAS/);assert.equal(stored.lastStudioSend.result.status,'awaiting_review');
console.log('Transport regressions passed: stale code, receiver offline, background worker delivery and saved acknowledgement.');})().catch(e=>{console.error(e);process.exit(1)});
