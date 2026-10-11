import { Worker } from 'node:worker_threads';
import { readFile, copyFile, chmod } from 'node:fs/promises';
import { uploadLimits } from '../src/lib/service-types.ts';
export interface Upload { id:string; name:string; mime:string; size:number; file:string; thumbnail?:string; }
let running=0;
export async function processUpload(input:string, output:string, thumbnail:string, name:string): Promise<Pick<Upload,'name'|'mime'|'size'|'thumbnail'>> {
  if(running>=2) throw Object.assign(new Error('Serwis przygotowuje inne pliki. Spróbuj za chwilę.'),{statusCode:503});
  running++;
  try {
    const bytes=await readFile(input);
    if(!bytes.length||bytes.length>uploadLimits.inputBytes)throw new Error('Niepoprawny rozmiar pliku.');
    const safeName=name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160)||'zalacznik';
    if(/\.pdf$/i.test(safeName)) { if(!bytes.subarray(0,1024).includes(Buffer.from('%PDF-')))throw new Error('Plik nie jest dokumentem PDF.');await copyFile(input,output);await chmod(output,0o600);return {name:safeName,mime:'application/pdf',size:bytes.length}; }
    return await new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./image-worker.ts',import.meta.url),{workerData:{input,output,thumbnail},resourceLimits:{maxOldGenerationSizeMb:192}});
      const timer=setTimeout(()=>{void worker.terminate();reject(new Error('Przetwarzanie zdjęcia trwało zbyt długo. Spróbuj dodać JPG.'));},30_000);
      worker.once('message',result=>{clearTimeout(timer);void worker.terminate();if(result.error)reject(new Error(result.error));else resolve({name:safeName.replace(/\.[^.]+$/,'.jpg'),...result,thumbnail});});
      worker.once('error',error=>{clearTimeout(timer);reject(error);});worker.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(new Error('Nie udało się przygotować zdjęcia.'));});
    });
  } finally {running--;}
}
