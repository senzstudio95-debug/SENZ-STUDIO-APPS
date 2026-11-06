export function installTubeLauncher(){
 const host=document.querySelector('.top-actions');if(!host||document.getElementById('senz-tube-launch'))return;
 const button=document.createElement('button');button.id='senz-tube-launch';button.className='soft panel-menu-button';button.title='SENZ TUBE · YouTube Browser & Mini Player';button.innerHTML='<img src="tube-icon.svg" alt="" style="width:28px;height:28px;vertical-align:middle;margin-right:5px">TUBE';
 button.addEventListener('click',async()=>{try{if(!window.senzDesktop?.tube)throw Error('SENZ TUBE is available in the Windows app.');await window.senzDesktop.tube();}catch(e){alert(e.message);}});host.prepend(button);
}
