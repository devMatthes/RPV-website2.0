import { validateContact } from '../../src/lib/contact-schema.ts';
import type { WorkerEnv } from './config.ts';
import { secret } from './config.ts';
import { consumeWindow, existing, insertContact } from './database.ts';
import { digest, sign } from './security.ts';
import { HttpError, objectBody, readBody } from './http.ts';
export async function submitContact(request:Request,env:WorkerEnv,key:string,owner:string,now:number) {
  const raw=objectBody(await readBody(request));
  if(Object.keys(raw).some(name=>!['name','email','phone','topic','message','privacy','website'].includes(name)))throw new HttpError(422,'Niepoprawne pola formularza.');
  const {data,errors}=validateContact(raw);
  if(data.website)throw new HttpError(422,'Nie udało się zweryfikować formularza.');
  if(Object.keys(errors).length)throw new HttpError(422,'Sprawdź zaznaczone pola.',errors);
  const keyHash=await digest(`contact:${key}`),fingerprint=await digest(JSON.stringify(data));
  const previous=await existing(env.DB,keyHash);
  if(previous) {
    if(previous.fingerprint!==fingerprint)throw new HttpError(409,'Dane zmieniły się od poprzedniej wysyłki. Rozpocznij nową wysyłkę.');
    return {reference:previous.reference,created:false};
  }
  await consumeWindow(env.DB,owner,'contact',6,3600000,now);
  await consumeWindow(env.DB,await sign('global:contact',secret(env)),'contact-global',env.ENVIRONMENT==='staging'?10:50,86400000,now);
  return insertContact(env.DB,data,keyHash,fingerprint,now);
}
