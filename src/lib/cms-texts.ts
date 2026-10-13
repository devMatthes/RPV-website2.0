import {audiences,bannerCopy,services} from '../data/home.ts';
import {principles,aboutAudiences} from '../data/content.ts';
export interface TextField {key:string;label:string;group:string;default:string;max:number;multiline?:boolean;type?:'email'|'tel';}
export interface TextPage {slug:string;title:string;fields:TextField[];}
const f=(key:string,label:string,group:string,value:string,max=400,multiline=true,type?:'email'|'tel'):TextField=>({key,label,group,default:value,max,multiline,type});
export const textPages:TextPage[]=[
 {slug:'home',title:'Strona główna',fields:[
  f('heroLine1','Nagłówek — pierwsza linia','Hero','Instalacje dopasowane',48,false),f('heroLine2','Nagłówek — druga linia','Hero','do Twoich potrzeb.',48,false),
  f('heroDescription','Opis pod nagłówkiem','Hero','Fotowoltaika, magazyny energii, pompy ciepła i instalacje elektryczne dla domów, firm i większych inwestycji. Od doboru technologii po montaż i uruchomienie.',600),
  ...audiences.map(a=>f('audience-'+a.slug,a.title,'Dla kogo',a.description,800)),
  f('bannerHeading','Nagłówek banera','Baner','Instalacje dla Twoich potrzeb',100,false),f('bannerDescription','Opis banera','Baner',bannerCopy,1200),
  ...services.map(s=>f('service-'+s.slug,s.title,'Usługi',s.description,600)),
  f('experienceLead','Pierwsza część nagłówka','Doświadczenie','znani z',50,false),f('experienceHeading','Druga część nagłówka','Doświadczenie','innowacyjnych\nrozwiązań',100),
  f('leadershipTitle','Wyróżnienie','Doświadczenie','Numer 1 w regionie',100,false),f('leadershipDescription','Opis wyróżnienia','Doświadczenie','Lider montażu fotowoltaiki',160,false),
  f('installationCount','Liczba instalacji — tylko potwierdzona wartość','Doświadczenie','500+',16,false),f('experienceYears','Lata doświadczenia — tylko potwierdzona wartość','Doświadczenie','20+',16,false),
  f('invitationTitle','Zaproszenie do realizacji','Doświadczenie','Poznaj galerię doskonałości',100,false),f('invitationDescription','Opis zaproszenia','Doświadczenie','Nasze starannie wykonane instalacje łączą precyzję i wydajność',400),
 ]},
 {slug:'about',title:'O nas',fields:[
  f('heroHeading','Nagłówek — każda linia osobno','Wprowadzenie','Poznaj RPV.\nOd projektu\ndo uruchomienia.',180),f('heroDescription','Opis','Wprowadzenie','Projektujemy i montujemy instalacje dla domów, firm i inwestycji. Łączymy dobór urządzeń, montaż i uruchomienie w jeden spójny proces.',800),
  f('processHeading','Nagłówek sekcji','Sposób pracy','Najpierw potrzeby.\nPotem rozwiązanie.',180),f('processDescription','Wprowadzenie do sekcji','Sposób pracy','Patrzymy na cały system, nie tylko na pojedyncze urządzenie.',600),
  ...principles.flatMap((p,i)=>[f(`principle${i+1}Title`,`Krok ${i+1} — tytuł`,'Sposób pracy',p.title,100,false),f(`principle${i+1}Description`,`Krok ${i+1} — opis`,'Sposób pracy',p.description,800)]),
  f('audiencesHeading','Nagłówek sekcji','Dla kogo','Dom. Firma. Inwestycja.',180),f('audiencesDescription','Wprowadzenie do sekcji','Dla kogo','Różna skala. Ten sam punkt wyjścia — Twoje potrzeby.',600),...aboutAudiences.map(a=>f('audience-'+a.slug,a.title,'Dla kogo',a.description,600)),
  f('projectsHeading','Nagłówek','Realizacje','Sprawdź to w realizacjach.',180),f('projectsDescription','Opis','Realizacje','W szczegółach projektów znajdziesz zakres prac i parametry instalacji. To miejsce na konkretne przykłady naszej pracy.',800),
  f('serviceHeading','Nagłówek','Wsparcie','Masz już instalację?',180),f('serviceDescription','Opis','Wsparcie','Zgłoś potrzebę serwisu. Opis problemu, zdjęcia i oznaczenia urządzeń pomogą nam zrozumieć sytuację.',800),
 ]},
 ...(['contact','service'] as const).map(slug=>({slug,title:slug==='contact'?'Kontakt':'Serwis',fields:[
  f('heroHeading','Nagłówek strony','Wprowadzenie','Porozmawiajmy o Twojej instalacji.',180),f('heroDescription','Opis strony','Wprowadzenie','Planujesz nową instalację lub potrzebujesz wsparcia? Wybierz temat i napisz do nas.',800),
  f('directHeading','Nagłówek kontaktu bezpośredniego','Kontakt bezpośredni','Wolisz porozmawiać?',100,false),f('directDescription','Opis','Kontakt bezpośredni',slug==='contact'?'Opowiedz nam o swoich potrzebach. Pomożemy dobrać rozwiązanie do Twojego domu, firmy lub inwestycji.':'Opisz problem i dodaj zdjęcia instalacji. Pomogą nam sprawniej ocenić zgłoszenie.',800),
  f('shortcutDescription','Opis odsyłacza do drugiego formularza','Kontakt bezpośredni',slug==='contact'?'Masz już instalację i potrzebujesz pomocy?':'Masz pytanie o nową instalację?',180),
  f('formHeading','Nagłówek formularza','Formularz',slug==='contact'?'Napisz do nas':'Zgłoszenie serwisowe',100,false),f('formDescription','Opis nad formularzem','Formularz',slug==='contact'?'Zapytaj o wycenę, rozwiązania lub współpracę.':'Podaj dane instalacji i opisz problem. Pola oznaczone * są wymagane.',600),
 ]})),
 {slug:'shared',title:'Kontakt i stopka — wspólne',fields:[
  f('phone','Numer telefonu z prefiksem +48','Dane kontaktowe','+48 515 114 676',30,false,'tel'),f('email','Publiczny adres e-mail','Dane kontaktowe','kontakt@rpv.pl',254,false,'email'),
  f('footerDescription','Opis firmy w stopce','Stopka','RPV to firma specjalizująca się w projektowaniu i montażu instalacji fotowoltaicznych oraz systemów energetycznych dla domów, firm i dużych inwestycji na terenie całej Polski.',800),
  f('footerContactHeading','Nagłówek kontaktu w stopce','Stopka','Napisz do nas',80,false),
  f('ctaHeading','Nagłówek sekcji kontaktowej','Zaproszenie do kontaktu','Porozmawiajmy o Twojej instalacji.',180),f('ctaDescription','Opis standardowy','Zaproszenie do kontaktu','Opowiedz nam o swoim budynku i potrzebach. Dobierzemy zakres prac i przygotujemy wycenę.',600),f('ctaEditorialDescription','Opis w poradniku','Zaproszenie do kontaktu','Porozmawiajmy o Twoim budynku i planach. Dobór rozwiązania zaczynamy od potrzeb, nie od gotowego zestawu.',600),
 ]},
];
export function textPage(slug:string):TextPage|undefined{return textPages.find(page=>page.slug===slug);}
export function textDefaults(page:TextPage):Record<string,string>{return Object.fromEntries(page.fields.map(field=>[field.key,field.default]));}
export function validateTexts(page:TextPage,raw:unknown):Record<string,string>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Niepoprawne teksty.');const input=raw as Record<string,unknown>;
 if(Object.keys(input).length!==page.fields.length||Object.keys(input).some(key=>!page.fields.some(field=>field.key===key)))throw new Error('Niepoprawny zestaw pól. Odśwież edytor.');
 const result:Record<string,string>={};
 for(const field of page.fields){const value=input[field.key];if(typeof value!=='string')throw new Error(`Uzupełnij pole: ${field.label}.`);const text=value.normalize('NFC').trim();if(!text||text.length>field.max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)||(!field.multiline&&/[\r\n]/.test(text)))throw new Error(`Sprawdź pole: ${field.label} (maks. ${field.max} znaków).`);
  if(field.type==='email'&&(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(text)||text.startsWith('.')||text.includes('..')||text.split('@')[0].endsWith('.')))throw new Error('Podaj poprawny publiczny adres e-mail.');
  if(field.type==='tel'&&(!/^[+\d\s()-]+$/.test(text)||!/^\+[1-9]\d{7,14}$/.test(text.replace(/[\s()-]/g,''))))throw new Error('Podaj numer telefonu z prefiksem kraju, np. +48 515 114 676.');
  result[field.key]=text;
 }
 if(new TextEncoder().encode(JSON.stringify(result)).length>28*1024)throw new Error('Teksty tej grupy są zbyt długie. Skróć je przed zapisem.');return result;
}
