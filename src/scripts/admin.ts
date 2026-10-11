import { adminCases, statuses, type CaseStatus } from '../data/admin';
import { defaultState, parseDemoState, filterCases, type DemoState } from '../lib/admin-demo';
const key = (id: string) => `rpv-panel-demo-v1:${id}`;
const states = new Map<string,DemoState>();
for (const item of adminCases) {
  try { states.set(item.id,parseDemoState(sessionStorage.getItem(key(item.id)),item)); }
  catch { states.set(item.id,defaultState(item)); }
}
const setBadge = (node: HTMLElement, status: CaseStatus) => { node.className = `case-status case-status--${status}`; node.textContent = statuses[status]; };
for (const node of document.querySelectorAll<HTMLElement>('[data-nav-count]')) node.textContent = String(adminCases.filter(c => c.module === node.dataset.navCount && states.get(c.id)?.status === 'new').length);
const dialog = document.querySelector<HTMLDialogElement>('#panel-menu');
const opener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
opener?.addEventListener('click',()=>dialog?.showModal());
document.querySelector('[data-menu-close]')?.addEventListener('click',()=>dialog?.close());
dialog?.addEventListener('close',()=>opener?.focus());
dialog?.addEventListener('click',event=>{if(event.target === dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom)dialog.close();}});
const list = document.querySelector<HTMLElement>('[data-case-list]');
if (list) {
  const items = adminCases.filter(c=>c.module === list.dataset.module);
  const form = list.querySelector<HTMLFormElement>('form')!;
  const query = form.elements.namedItem('query') as HTMLInputElement;
  const status = form.elements.namedItem('status') as HTMLSelectElement;
  const subject = form.elements.namedItem('subject') as HTMLSelectElement;
  const period = form.elements.namedItem('period') as HTMLSelectElement;
  const previous = list.querySelector<HTMLButtonElement>('[data-page-prev]')!;
  const next = list.querySelector<HTMLButtonElement>('[data-page-next]')!;
  const mobile = matchMedia('(max-width: 899px)');
  let page = 0;
  const render = () => {
    const filtered = filterCases(items,states,{query:query.value,status:status.value,subject:subject.value,period:period.value});
    const pageSize = mobile.matches ? 3 : 6;
    page = Math.min(page,Math.max(0,Math.ceil(filtered.length/pageSize)-1));
    const visible = new Set(filtered.slice(page*pageSize,(page+1)*pageSize).map(c=>c.id));
    list.querySelectorAll<HTMLElement>('[data-case-id]').forEach(node=>{ const id=node.dataset.caseId!;node.hidden=!visible.has(id);const state=states.get(id)!;const badge=node.querySelector<HTMLElement>('[data-badge]');if(badge)setBadge(badge,state.status);const owner=node.querySelector('[data-owner]');if(owner)owner.textContent=state.owner; });
    list.querySelectorAll<HTMLElement>('[data-status-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.statusTab === status.value)));
    list.querySelectorAll<HTMLElement>('[data-status-count]').forEach(node=>node.textContent=String(items.filter(c=>!node.dataset.statusCount || states.get(c.id)?.status === node.dataset.statusCount).length));
    const counts = {open:items.filter(c=>states.get(c.id)?.status !== 'closed').length,new:items.filter(c=>states.get(c.id)?.status === 'new').length,unassigned:items.filter(c=>states.get(c.id)?.owner === 'Nieprzypisane').length};
    Object.entries(counts).forEach(([key,count])=>{const node=list.querySelector(`[data-stat="${key}"]`);if(node)node.textContent=String(count);});
    list.querySelector<HTMLElement>('[data-empty]')!.hidden=filtered.length>0;
    list.querySelector<HTMLElement>('.admin-table-wrap')!.hidden=filtered.length===0;
    list.querySelector<HTMLElement>('.admin-case-cards')!.hidden=filtered.length===0;
    list.querySelector<HTMLElement>('[data-page-summary]')!.textContent=filtered.length ? `${page*pageSize+1}–${Math.min((page+1)*pageSize,filtered.length)} z ${filtered.length} · Najnowsze najpierw` : '0 wyników';
    previous.disabled=page===0;next.disabled=(page+1)*pageSize>=filtered.length;
  };
  form.addEventListener('submit',event=>event.preventDefault());
  form.addEventListener('input',()=>{page=0;render();});
  form.addEventListener('reset',()=>{page=0;queueMicrotask(render);});
  list.querySelector('[data-clear-filters]')?.addEventListener('click',()=>form.reset());
  list.querySelectorAll<HTMLElement>('[data-status-tab]').forEach(button=>button.addEventListener('click',()=>{status.value=button.dataset.statusTab!;page=0;render();}));
  previous.addEventListener('click',()=>{page--;render();});next.addEventListener('click',()=>{page++;render();});
  mobile.addEventListener('change',()=>{page=0;render();});render();
}
const detail = document.querySelector<HTMLElement>('[data-case-detail]');
if (detail) {
  const id = detail.dataset.caseDetail!;
  const state = states.get(id)!;
  const manage = detail.querySelector<HTMLFormElement>('[data-manage-form]')!;
  const status = manage.elements.namedItem('status') as HTMLSelectElement;
  const owner = manage.elements.namedItem('owner') as HTMLSelectElement;
  const noteForm = detail.querySelector<HTMLFormElement>('[data-note-form]')!;
  const note = noteForm.elements.namedItem('note') as HTMLTextAreaElement;
  const dateLabel = (date:string)=>new Date(date).toLocaleString('pl-PL',{dateStyle:'short',timeStyle:'short'});
  const save = ()=>{try{sessionStorage.setItem(key(id),JSON.stringify(state));return true;}catch{return false;}};
  const render = ()=>{
    status.value=state.status;owner.value=state.owner;
    setBadge(manage.querySelector<HTMLElement>('[data-badge]')!,state.status);
    const notes=detail.querySelector<HTMLElement>('[data-notes]')!;notes.replaceChildren();
    state.notes.forEach(entry=>{const article=document.createElement('article');article.className='admin-saved-note';const time=document.createElement('p');time.className='admin-caption';time.textContent=`Administrator · ${dateLabel(entry.date)}`;const text=document.createElement('p');text.textContent=entry.text;article.append(time,text);notes.append(article);});
    const history=detail.querySelector<HTMLOListElement>('[data-history]')!;
    history.querySelectorAll('[data-demo-event]').forEach(n=>n.remove());
    state.history.forEach(entry=>{const li=document.createElement('li');li.dataset.demoEvent='';const time=document.createElement('time');time.className='admin-caption';time.dateTime=entry.date;time.textContent=dateLabel(entry.date);const text=document.createElement('p');text.textContent=entry.text;li.append(time,text);history.append(li);});
    document.querySelectorAll<HTMLElement>('[data-nav-count]').forEach(node=>node.textContent=String(adminCases.filter(c=>c.module===node.dataset.navCount && states.get(c.id)?.status==='new').length));
  };
  manage.addEventListener('submit',event=>{
    event.preventDefault();const newStatus=status.value as CaseStatus;
    if(state.status===newStatus && state.owner===owner.value){detail.querySelector('[data-manage-feedback]')!.textContent='Nie ma nowych zmian do zapisania.';return;}
    state.status=newStatus;state.owner=owner.value;state.history.push({text:`Demo: zmieniono status na „${statuses[newStatus]}”, opiekun: ${owner.value}.`,date:new Date().toISOString()});state.history=state.history.slice(-50);
    const saved=save();render();detail.querySelector('[data-manage-feedback]')!.textContent=saved ? 'Zapisano w tej karcie przeglądarki (demo).' : 'Zmiany dostępne do odświeżenia — pamięć przeglądarki niedostępna.';
  });
  note.addEventListener('input',()=>note.setCustomValidity(''));
  noteForm.addEventListener('submit',event=>{
    event.preventDefault();const text=note.value.trim();if(!text){note.setCustomValidity('Wpisz treść notatki.');note.reportValidity();return;}
    if(state.notes.length>=20){detail.querySelector('[data-note-feedback]')!.textContent='Osiągnięto limit 20 notatek w wersji demo.';return;}
    const date=new Date().toISOString();state.notes.push({text,date});state.history.push({text:'Demo: dodano notatkę wewnętrzną.',date});state.history=state.history.slice(-50);
    const saved=save();note.value='';render();detail.querySelector('[data-note-feedback]')!.textContent=saved ? 'Dodano notatkę w tej karcie przeglądarki (demo).' : 'Notatka dostępna do odświeżenia — pamięć przeglądarki niedostępna.';
  });render();
}
