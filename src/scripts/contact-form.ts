import type { ContactSubmission } from '../lib/contact-types';
import { attachTurnstile } from './form-turnstile';
const form=document.querySelector<HTMLFormElement>('[data-contact-form]');
if(form) {
 const verification=attachTurnstile(form,'contact');
 const button=form.querySelector<HTMLButtonElement>('[type=submit]')!,feedback=form.querySelector<HTMLElement>('.form-feedback')!,notice=form.querySelector<HTMLElement>('.api-notice')!;
 const input=(name:string)=>form.elements.namedItem(name) as HTMLInputElement;
 const data=():ContactSubmission=>({name:input('name').value,email:input('email').value,phone:input('phone').value,topic:input('topic').value,message:input('message').value,privacy:input('privacy').checked,website:input('website').value});
 const show=(message:string)=>{feedback.textContent=message;feedback.hidden=false;};
 const errors=(items:Record<string,string>)=>{
  for(const name of ['name','email','phone','topic','message','privacy']){
   const field=input(name),error=document.getElementById(`field-${name}-error`)!;error.textContent=items[name]??'';error.hidden=!error.textContent;
   if(error.textContent)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
  }
 };
 let attempted=false,sending=false,key=crypto.randomUUID(),signature='',validationVersion=0;
 const validate=async()=>{const version=++validationVersion;const {validateContact}=await import('../lib/contact-schema');const result=validateContact(data());if(version===validationVersion)errors(result.errors);return result;};
 button.disabled=false;
 if(!form.dataset.api){notice.hidden=false;notice.textContent='Wysyłka wiadomości nie jest jeszcze uruchomiona. Możesz przygotować dane w formularzu lub skontaktować się telefonicznie albo mailowo.';}
 input('phone').addEventListener('beforeinput',(event:InputEvent)=>{if(event.data&&/[^+\d\s()-]/.test(event.data))event.preventDefault();});
 form.addEventListener('input',()=>{if(sending)return;feedback.hidden=true;if(attempted)void validate().catch(()=>{});});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;sending=true;attempted=true;
  let locked: (HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)[]=[];
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
   const result=await validate();
   if(Object.keys(result.errors).length){show('Sprawdź zaznaczone pola.');return;}
   if(!form.dataset.api){show('Wysyłka nie jest jeszcze dostępna. Dane pozostają w formularzu. Napisz na kontakt@rpv.pl lub zadzwoń: 515 114 676.');return;}
   const next=JSON.stringify(result.data);if(signature!==next){signature=next;key=crypto.randomUUID();}
   button.disabled=true;button.textContent='Wysyłamy…';
   locked=Array.from(form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea'));locked.forEach(field=>field.disabled=true);
   show('Weryfikujemy formularz…');const token=await verification.token();
   show('Wysyłamy wiadomość…');const abort=new AbortController();timer=setTimeout(()=>abort.abort(),30000);
   const response=await fetch(`${form.dataset.api.replace(/\/$/,'')}/api/contact`,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','Idempotency-Key':key,'X-Turnstile-Token':token},body:next,signal:abort.signal});
   let receipt:{reference?:string;message?:string;errors?:Record<string,string>};
   try{receipt=await response.json();}catch{throw new Error('Nie otrzymaliśmy potwierdzenia zapisu. Spróbuj ponownie.');}
   if(!response.ok){if(receipt.errors)errors(receipt.errors);throw new Error(receipt.message??'Nie udało się zapisać wiadomości.');}
   if(typeof receipt.reference!=='string'||!/^KON-\d{4}-\d{6,}$/.test(receipt.reference))throw new Error('Nie otrzymaliśmy potwierdzenia zapisu. Spróbuj ponownie.');
   form.reset();attempted=false;validationVersion++;errors({});signature='';key=crypto.randomUUID();
   show(`Wiadomość ${receipt.reference} została zapisana. Zachowaj ten numer. RPV skontaktuje się z Tobą po zapoznaniu się ze szczegółami.`);
  }catch(error){show(`${error instanceof DOMException&&error.name==='AbortError'?'Serwer nie odpowiedział w czasie.':error instanceof TypeError?'Nie udało się połączyć z serwerem.':error instanceof Error?error.message:'Nie udało się wysłać wiadomości.'} Dane pozostają w formularzu. Możesz spróbować ponownie.`);}
  finally{verification.reset();if(timer)clearTimeout(timer);sending=false;locked.forEach(field=>field.disabled=false);button.disabled=false;button.textContent='Wyślij wiadomość';(form.querySelector<HTMLElement>('[aria-invalid=true]')??feedback).focus();}
 });
}
