export const cmsCategories = ['fotowoltaika','magazyny-energii','pompy-ciepla','instalacje'] as const;
export interface ProjectDraft {
 title:string;slug:string;category:string;description:string;introduction:string;
 location:string;power:string;building:string;date:string;
 assumptions:string;scope:string;result:string;specification:string;
 archived:boolean;images:{id:string;alt:string}[];
}
export function validateProject(raw:unknown): ProjectDraft {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Niepoprawne dane realizacji.');
 const value=raw as Record<string,unknown>;const allowed=['title','slug','category','description','introduction','location','power','building','date','assumptions','scope','result','specification','archived','images'];
 if(Object.keys(value).some(key=>!allowed.includes(key)))throw new Error('Nieznane pole realizacji.');
 const text=(key:string,max:number,min=0)=>{const x=value[key];if(typeof x!=='string')throw new Error(`Uzupełnij pole: ${key}.`);const s=x.normalize('NFC').trim();if(s.length<min||s.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s))throw new Error(`Niepoprawne pole: ${key}.`);return s;};
 const title=text('title',120,3),slug=text('slug',100,3),category=text('category',40);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Adres może zawierać małe litery, cyfry i pojedyncze myślniki.');
 if(!(cmsCategories as readonly string[]).includes(category))throw new Error('Wybierz kategorię realizacji.');
 const date=text('date',10);if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw new Error('Niepoprawna data.');
 if(typeof value.archived!=='boolean'||!Array.isArray(value.images)||value.images.length>12)throw new Error('Niepoprawna galeria lub status.');
 const images=value.images.map(x=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['id','alt'].includes(k))||typeof x.id!=='string'||!/^[a-f0-9-]{36}$/.test(x.id)||typeof x.alt!=='string'||!x.alt.trim()||x.alt.length>240)throw new Error('Każde zdjęcie wymaga opisu, maksymalnie 240 znaków.');return {id:x.id,alt:x.alt.normalize('NFC').trim()};});
 if(new Set(images.map(x=>x.id)).size!==images.length)throw new Error('Zdjęcie nie może wystąpić dwukrotnie.');
 return {title,slug,category,date,archived:value.archived,images,description:text('description',400),introduction:text('introduction',2000),location:text('location',160),power:text('power',100),building:text('building',120),assumptions:text('assumptions',3000),scope:text('scope',3000),result:text('result',3000),specification:text('specification',3000)};
}
export function approvalProblems(draft:ProjectDraft):string[] {
 return [...(!draft.archived&&!draft.images.length?['Dodaj co najmniej jedno zdjęcie.']:[]),...(!draft.archived&&(!draft.description||!draft.introduction||!draft.scope)?['Uzupełnij opis, wprowadzenie i zakres prac.']:[])];
}
