'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createLicense,TRIAL_MS,serialHash}=require(path.join(process.env.SENZ_APP,'license-core.cjs'));
const DAY=86400000,serial='SENZ'+'a'.repeat(32);
function device(){let time=1000000,raw=null;const opts={machine:'test-machine',hashes:[serialHash(serial)],secret:'test-only',now:()=>time,mono:()=>0,read:()=>[raw],write:v=>raw=v};return {open:()=>createLicense(opts),advance:n=>time+=n,opts};}
test('Seven calendar days, including closed time',()=>{const d=device();assert.equal(TRIAL_MS,7*DAY);assert.equal(d.open().status().remainingMs,7*DAY);d.advance(7*DAY-1);assert.equal(d.open().status().remainingMs,1);d.advance(1);assert.equal(d.open().status().active,false);});
test('Reopening preserves elapsed time',()=>{const d=device();d.open();d.advance(2*DAY);assert.equal(d.open().status().remainingMs,5*DAY);assert.equal(d.open().status().remainingMs,5*DAY);});
test('Permanent activation survives expiry',()=>{const d=device();d.open().activate(serial);d.advance(30*DAY);assert.equal(d.open().status().licensed,true);});
test('Expired trial stays expired',()=>{const d=device();d.open();d.advance(7*DAY);assert.equal(d.open().status().active,false);assert.equal(d.open().status().active,false);});
test('Clock rollback remains blocked',()=>{const d=device();d.open();d.advance(DAY);d.open().flush();d.advance(-DAY/2);assert.equal(d.open().status().active,false);});
test('Storage failure cannot grant access',()=>{const d=device();assert.equal(createLicense({...d.opts,write:()=>{throw Error('read only')}}).status().active,false);});
test('Existing 48-hour grant remains scoped',()=>{const d=device(),opts={...d.opts,machine:'110792888239'+'a'.repeat(52),demoGrant:{id:'existing-grant',machineId:'110792888239',durationMs:2*DAY}};assert.equal(createLicense(opts).status().totalMs,2*DAY);d.advance(2*DAY);assert.equal(createLicense(opts).status().active,false);assert.equal(createLicense(opts).status().active,false);});
