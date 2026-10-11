import { uploadLimits, validateServiceFiles } from '../lib/service-schema';
export interface SelectedFile { file: File; preview?: string; originalBytes: number; }
export function attachFiles(form: HTMLFormElement) {
  const picker=form.querySelector<HTMLInputElement>('#service-files')!;
  const list=form.querySelector<HTMLUListElement>('.file-list')!;
  const error=form.querySelector<HTMLElement>('#file-error')!;
  const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;
  const selected:SelectedFile[]=[]; let busy=false; let controller:AbortController|undefined;
  const showError=(message:string)=>{error.textContent=message;error.hidden=!message;};
  const render=()=>{
    list.replaceChildren();selected.forEach((item,index)=>{const li=document.createElement('li');if(item.preview){const image=document.createElement('img');image.src=item.preview;image.alt='';li.append(image);}const label=document.createElement('span');label.textContent=`${item.file.name} · ${Math.ceil(item.file.size/1024)} kB${item.file.size<item.originalBytes?` (z ${Math.ceil(item.originalBytes/1024)} kB)`:''}`;const remove=document.createElement('button');remove.type='button';remove.textContent='Usuń';remove.disabled=busy;remove.setAttribute('aria-label',`Usuń ${item.file.name}`);remove.onclick=()=>{if(item.preview)URL.revokeObjectURL(item.preview);selected.splice(index,1);render();showError('');};li.append(label,remove);list.append(li);});
    if(busy){const li=document.createElement('li');li.textContent='Przygotowujemy zdjęcia…';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Anuluj';cancel.onclick=()=>controller?.abort();li.append(cancel);list.append(li);}
  };
  picker.addEventListener('change',async()=>{
    if(busy)return;
    const files=Array.from(picker.files??[]);picker.value='';const validation=validateServiceFiles([...selected.map(item=>item.file),...files]);if(validation){showError(validation);return;}
    busy=true;controller=new AbortController();const signal=controller.signal;picker.disabled=true;submit.disabled=true;showError('');render();
    try {
      for(const original of files){
        if(signal.aborted)break;let file=original;
        if(!/\.pdf$/i.test(file.name)) {
          try {
            if(/\.hei[cf]$/i.test(file.name)){const {default:convert}=await import('heic2any');const output=await convert({blob:file,toType:'image/jpeg',quality:.9});if(signal.aborted)break;file=new File([Array.isArray(output)?output[0]:output],file.name.replace(/\.hei[cf]$/i,'.jpg'),{type:'image/jpeg'});}
            const {default:compress}=await import('browser-image-compression');
            const {default:workerURL}=await import('browser-image-compression/dist/browser-image-compression.js?url');
            file=await compress(file,{fileType:"image/jpeg",maxSizeMB:1.5,maxWidthOrHeight:uploadLimits.imageEdge,initialQuality:.9,useWebWorker:true,libURL:workerURL,signal,maxIteration:5});
            file=new File([file],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
          } catch(problem) { if(signal.aborted)break; /* Backend will decode unsupported images and enforce dimensions. */ file=original; }
        }
        const next=validateServiceFiles([...selected.map(item=>item.file),file]);if(next)throw new Error(next);
        const preview=/^image\/(jpeg|png|webp)$/.test(file.type)?URL.createObjectURL(file):undefined;
        selected.push({file,preview,originalBytes:original.size});render();
      }
    } catch(problem){showError(problem instanceof Error?problem.message:'Nie udało się przygotować plików.');}
    finally {busy=false;picker.disabled=false;submit.disabled=false;render();}
  });
  return { getFiles:()=>selected.map(item=>item.file), isBusy:()=>busy, reset:()=>{for(const item of selected)if(item.preview)URL.revokeObjectURL(item.preview);selected.length=0;render();}, lock:(value:boolean)=>{picker.disabled=value;list.querySelectorAll('button').forEach(button=>button.disabled=value);} };
}
