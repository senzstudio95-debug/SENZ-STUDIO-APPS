const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const expected=JSON.parse(fs.readFileSync('release-tools/publish-v202.json','utf8'));
const repo=process.env.GH_REPO;
function api(route,args=[]){return JSON.parse(execFileSync('gh',['api',`repos/${repo}/${route}`,...args],{encoding:'utf8'}));}
assert.match(expected.sha256,/^[a-f0-9]{64}$/);assert.match(expected.commit,/^[a-f0-9]{40}$/);assert(expected.size>0&&expected.size<400000000);
const run=api(`actions/runs/${expected.run}`);assert.equal(run.conclusion,'success');assert.equal(run.head_sha,expected.commit);assert.equal(run.name,'Build v2.9.202 Animated 3D Buddy');
const release=api(`releases/${expected.release}`);assert.equal(release.tag_name,'v2.9.202');assert.equal(release.draft,true);assert.equal(release.target_commitish,expected.commit);
const asset=release.assets.find(a=>a.name==='SENZ-STUDIO-UPDATE-v2.9.202.exe');assert(asset);assert.equal(asset.size,expected.size);assert.equal(asset.digest,'sha256:'+expected.sha256);
assert.equal(api('releases/latest').tag_name,'v2.9.201');
api(`releases/${release.id}`,['--method','PATCH','-F','draft=false','-f','make_latest=true']);assert.equal(api('releases/latest').tag_name,'v2.9.202');
console.log('Published verified SENZ STUDIO PRO v2.9.202: '+asset.size+' bytes');
