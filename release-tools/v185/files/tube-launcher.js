export function installTubeLauncher(){
 const host=document.querySelector('.mode-dock')||document.querySelector('.top-actions');if(!host||document.getElementById('senz-tube-launch'))return;
 const button=document.createElement('button');button.id='senz-tube-launch';button.className='mode-button';button.setAttribute('aria-label','SENZ TUBE');button.title='SENZ TUBE · YouTube Browser & Mini Player';button.innerHTML='<span class="mode-art"><img src="tube-icon.svg" alt="" style="width:100%;height:100%"></span><span class="mode-label">TUBE</span>';
 button.addEventListener('click',async()=>{try{if(!window.senzDesktop?.tube)throw Error('SENZ TUBE is available in the Windows app.');await window.senzDesktop.tube();}catch(e){alert(e.message);}});host.prepend(button);
}
