import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { contactTopics, type ContactSubmission } from './contact-types.ts';
export function validateContact(input: unknown): { data: ContactSubmission; errors: Record<string,string> } {
  const raw=input && typeof input==='object' && !Array.isArray(input)?input as Record<string,unknown>:{};
  const errors:Record<string,string>={};
  const field=(key:string,max:number,required=true)=>{
    const value=raw[key];const text=typeof value==='string'?value.normalize('NFC').trim():'';
    if(required&&!text)errors[key]='Uzupełnij to pole.';
    if(value!==undefined&&typeof value!=='string')errors[key]='Podaj tekst.';
    if(text.length>max)errors[key]=`Maksymalnie ${max} znaków.`;
    if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))errors[key]='Usuń niedozwolone znaki.';
    return text.slice(0,max);
  };
  const phoneText=field('phone',30,false);
  const phone=/^[+\d\s()-]+$/.test(phoneText)?parsePhoneNumberFromString(phoneText,'PL'):undefined;
  if(phoneText&&!phone?.isValid())errors.phone='Podaj poprawny numer, np. 515 114 676 lub +48 515 114 676.';
  const data:ContactSubmission={name:field('name',120),email:field('email',254),phone:phone?.number??phoneText,topic:field('topic',60),message:field('message',5000),privacy:raw.privacy===true,website:field('website',200,false)};
  const local=data.email.split('@')[0];
  if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(data.email)||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..'))errors.email='Podaj poprawny adres e-mail.';
  if(!contactTopics.includes(data.topic as typeof contactTopics[number]))errors.topic='Wybierz temat wiadomości.';
  if(!data.privacy)errors.privacy='Potwierdź zapoznanie się z informacją o przetwarzaniu danych.';
  return {data,errors};
}
