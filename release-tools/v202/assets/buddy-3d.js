// Small, dependency-free WebGL renderer for the supplied SENZ 3D character.
// Geometry/texture are bundled offline; no online model service is used.
let assetPromise;
const assetURL=name=>new URL(name,import.meta.url).href;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function motionFor(state,t,facing='right',reduced=false){
 const m={yaw:facing==='left'?-.12:.12,tilt:0,bob:0,breath:0,head:0,left:.38,right:-.38,step:0,squat:0};
 if(reduced)return m;
 if(state==='allFrames')state=['idle','wave','walk','happy','turn','dance','jump','sleep'][Math.floor(t/2)%8];
 m.breath=Math.sin(t*2.2)*.008;m.head=Math.sin(t*.8)*.035;
 if(['walk','run','backWalk'].includes(state)){const speed=state==='run'?12:8;m.step=Math.sin(t*speed)*.35;m.bob=Math.abs(Math.sin(t*speed))*.025;m.yaw=(facing==='left'?-1:1)*.6+(state==='backWalk'?Math.PI:0);m.left+=Math.sin(t*speed)*.14;m.right+=Math.sin(t*speed)*.14;}
 if(['wave','click','notification','guide','point','wink','import'].includes(state)){m.right=.55+Math.sin(t*6)*.2;m.head=-.08;}
 if(['happy','excited','love','laugh','cool'].includes(state)){m.bob=Math.abs(Math.sin(t*5))*.07;m.left=-.15;m.right=.15;m.tilt=Math.sin(t*3)*.035;}
 if(['jump','bounce','landing'].includes(state)){m.bob=Math.max(0,Math.sin(t*4))*.16;m.squat=-Math.min(0,Math.sin(t*4))*.06;m.left=-.2;m.right=.2;}
 if(state==='dance'){m.tilt=Math.sin(t*4)*.12;m.yaw=Math.sin(t*2)*.3;m.bob=Math.abs(Math.sin(t*4))*.05;m.left=Math.sin(t*4)*.3;m.right=Math.cos(t*4)*.3;m.step=Math.sin(t*4)*.25;}
 if(state==='turn')m.yaw=t*1.2;
 if(['thinking','worried','pen','loading'].includes(state)){m.head=.1+Math.sin(t*2)*.04;m.yaw=-.2;m.right=-.15;}
 if(['scared','drag','thrown','surprised'].includes(state)){m.left=-.3;m.right=.3;m.tilt=Math.sin(t*12)*.025;m.bob=.04;}
 if(state==='angry'){m.tilt=Math.sin(t*10)*.025;m.bob=Math.abs(Math.sin(t*6))*.025;m.head=-.08;}
 if(['sleep','sit','sad','minimize'].includes(state)){m.squat=state==='sit'?.12:.025;m.head=.1;m.breath=Math.sin(t*1.5)*.012;m.left=.5;m.right=-.5;}
 if(state==='stretch'){m.left=-.45;m.right=.45;m.bob=.025;}
 return m;
}
const vertex=`
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV;
uniform float uYaw,uTilt,uBob,uBreath,uHead,uLeft,uRight,uStep,uSquat,uAspect;
varying vec2 vUV; varying vec3 vNormal;
vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
void main(){
 vec3 p=aPosition,n=aNormal;float y=p.y,x=p.x;
 float leg=(1.0-smoothstep(.54,.80,y))*smoothstep(.015,.10,abs(x));
 float legAngle=uStep*(x<0.0?-1.0:1.0)*leg;
 p.yz=rot(p.yz-vec2(.66,0.0),legAngle)+vec2(.66,0.0); n.yz=rot(n.yz,legAngle);
 float arm=smoothstep(.25,.40,abs(x))*smoothstep(.84,.98,y)*(1.0-smoothstep(1.28,1.40,y));
 float armAngle=(x<0.0?uLeft:uRight)*arm;vec2 shoulder=vec2(x<0.0?-.27:.27,1.10);
 p.xy=rot(p.xy-shoulder,armAngle)+shoulder;n.xy=rot(n.xy,armAngle);
 float head=smoothstep(1.32,1.49,y);p.xy=rot(p.xy-vec2(0.0,1.38),uHead*head)+vec2(0.0,1.38);n.xy=rot(n.xy,uHead*head);
 p.y+=uBreath*smoothstep(.35,1.5,y);p.z*=1.0+uBreath;
 p.y-=uSquat*smoothstep(.1,.8,y);
 p.xz=rot(p.xz,uYaw);n.xz=rot(n.xz,uYaw);
 p.xy=rot(p.xy-vec2(0.0,.9),uTilt)+vec2(0.0,.9);n.xy=rot(n.xy,uTilt);
 p.y+=uBob;
 gl_Position=vec4(p.x/(1.2*uAspect),(p.y-1.03)/1.2,-p.z/4.0,1.0);
 vUV=aUV;vNormal=n;
}`;
const fragment=`precision mediump float;
uniform sampler2D uTexture; varying vec2 vUV; varying vec3 vNormal;
void main(){vec3 n=normalize(vNormal);float light=.80+.20*max(dot(n,normalize(vec3(-.4,.6,1.))),0.);vec4 c=texture2D(uTexture,vUV);gl_FragColor=vec4(c.rgb*light,c.a);}`;
async function assets(){
 if(!assetPromise)assetPromise=(async()=>{
  const response=await fetch(assetURL('buddy-3d.bin'));if(!response.ok)throw Error('Buddy mesh unavailable');const buffer=await response.arrayBuffer();const h=new DataView(buffer);
  if(h.byteLength<12||h.getUint32(0,true)!==0x44334253)throw Error('Invalid Buddy mesh');
  const count=h.getUint32(4,true),indices=h.getUint32(8,true);
  if(!count||count>65535||!indices||indices%3||buffer.byteLength!==12+count*32+indices*2)throw Error('Invalid Buddy geometry');
  const image=new Image();image.src=assetURL('buddy-3d-texture.webp');await image.decode();
  return {vertices:new Float32Array(buffer,12,count*8),indices:new Uint16Array(buffer,12+count*32,indices),image};
 })().catch(e=>{assetPromise=null;throw e;});
 return assetPromise;
}
function setup(gl,data){
 const shaders=[];let program;const buffers=[];let texture;
 const destroy=()=>{for(const b of buffers)gl.deleteBuffer(b);if(texture)gl.deleteTexture(texture);if(program)gl.deleteProgram(program);for(const s of shaders)gl.deleteShader(s);};
 try{
  function shader(type,source){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const vertices=gl.createBuffer();buffers.push(vertices);gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,data.vertices,gl.STATIC_DRAW);
  for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,12],['aUV',2,24]]){const i=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,32,offset);}
  const indices=gl.createBuffer();buffers.push(indices);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,data.indices,gl.STATIC_DRAW);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,data.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
  gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);gl.uniform1i(gl.getUniformLocation(program,'uTexture'),0);
  const uniforms=Object.fromEntries(['yaw','tilt','bob','breath','head','left','right','step','squat','aspect'].map(n=>[n,gl.getUniformLocation(program,'u'+n[0].toUpperCase()+n.slice(1))]));
  return {destroy,draw(m,w,h){gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);for(const [n,v] of Object.entries(m))gl.uniform1f(uniforms[n],v);gl.uniform1f(uniforms.aspect,w/h);gl.drawElements(gl.TRIANGLES,data.indices.length,gl.UNSIGNED_SHORT,0);}};
 }catch(e){destroy();throw e;}
}
export function install3DRenderer(root){
 const canvas=root.querySelector('.buddy-sprite');if(!canvas)return ()=>{};
 if(canvas._buddy3DSync)return canvas._buddy3DSync;
 canvas.style.setProperty('background',`url("${assetURL('buddy-3d-poster.png')}") center/contain no-repeat`,'important');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let gl,renderer,loading=false,disposed=false,failed=false,raf=0,last=0,start=performance.now(),state='',current,frames=0;
 function visible(){return root.isConnected&&!root.hidden&&!document.hidden;}
 function stop(){cancelAnimationFrame(raf);raf=0;}
 function fallback(){stop();failed=true;canvas.dataset.renderer='poster';canvas.style.setProperty('background',`url("${assetURL('buddy-3d-poster.png')}") center/contain no-repeat`,'important');}
 function size(){const dpr=Math.min(2,devicePixelRatio||1),w=clamp(Math.round((canvas.clientWidth||144)*dpr),32,512),h=clamp(Math.round((canvas.clientHeight||144)*dpr),32,512);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
 function frame(now){
  raf=0;if(disposed||!visible()||!renderer||gl.isContextLost())return;
  if(now-last<1000/30){raf=requestAnimationFrame(frame);return;}
  const dt=Math.min(.1,(now-last)/1000||.033);last=now;
  const next=root.dataset.state||'idle';if(next!==state){state=next;start=now;}
  const target=motionFor(state,(now-start)/1000,root.dataset.facing,reduced.matches);
  if(!current||reduced.matches)current={...target};else for(const k in target){let delta=target[k]-current[k];if(k==='yaw')delta=Math.atan2(Math.sin(delta),Math.cos(delta));current[k]+=delta*(1-Math.exp(-dt*14));}
  size();renderer.draw(current,canvas.width,canvas.height);frames++;canvas._buddyFrames=frames;if(canvas.dataset.state!==state)canvas.dataset.state=state;
  if(!reduced.matches)raf=requestAnimationFrame(frame);
 }
 async function sync(){
  if(disposed)return;if(!root.isConnected){dispose();return;}if(!visible()){stop();return;}
  if(!renderer&&!loading&&!failed){loading=true;try{
   const data=await assets();if(disposed)return;
   gl||=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false,powerPreference:'low-power'});
   if(!gl)throw Error('WebGL unavailable');
   renderer=setup(gl,data);canvas.dataset.renderer='webgl';canvas.style.setProperty('background','none','important');
  }catch(e){fallback();console.warn('SENZ Buddy: using the bundled still image.',e.message);}finally{loading=false;}}
  if(renderer&&visible()&&!raf){last=0;raf=requestAnimationFrame(frame);}
 }
 const observer=new MutationObserver(sync);observer.observe(root,{attributes:true,attributeFilter:['hidden','data-state','data-facing']});
 const resize=new ResizeObserver(()=>{size();sync();});resize.observe(canvas);
 const lost=e=>{e.preventDefault();stop();renderer=null;canvas.style.setProperty('background',`url("${assetURL('buddy-3d-poster.png')}") center/contain no-repeat`,'important');canvas.dataset.renderer='restoring';};
 const restored=()=>{failed=false;sync();};
 function dispose(){disposed=true;stop();observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',changed);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);renderer?.destroy();renderer=null;delete canvas._buddy3DSync;}
 function changed(){stop();last=0;sync();}
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',changed);canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
 sync.dispose=dispose;canvas._buddy3DSync=sync;sync();return sync;
}
