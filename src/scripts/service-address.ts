import type { ServiceAddress } from '../lib/service-schema';
type Prediction = { id: string; text: string };
export function attachAddress(form: HTMLFormElement, api: string) {
  const container = form.querySelector<HTMLElement>('.address-search')!;
  const search = container.querySelector<HTMLInputElement>('input')!;
  const list = container.querySelector<HTMLUListElement>('ul')!;
  const status = container.querySelector<HTMLElement>('[role=status]')!;
  const attribution = container.querySelector<HTMLElement>('.google-attribution')!;
  let token = crypto.randomUUID(); let last = ''; let timer: ReturnType<typeof setTimeout>; let controller: AbortController | undefined;
  let predictions: Prediction[] = []; let active = -1; let version = 0; let selection: Partial<ServiceAddress> = { source: 'manual' };
  const close = () => { list.hidden = true; attribution.hidden = true; search.setAttribute('aria-expanded','false'); search.removeAttribute('aria-activedescendant'); active = -1; };
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const request = async (path: string, body: unknown, signal: AbortSignal) => { const res = await fetch(`${api}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal }); if(!res.ok) throw new Error('Adres niedostępny'); return res.json(); };
  const choose = async (prediction: Prediction) => {
    clearTimeout(timer); controller?.abort(); const generation = ++version; controller = new AbortController(); close(); status.textContent = 'Uzupełniamy adres…';
    try { const result = await request('/api/address/details', { id:prediction.id, token }, controller.signal); if(generation !== version) return;
      // Clear old values before populating a different address; missing data must be completed manually.
      for(const name of ['street','building','apartment','postcode','city','commune','county','province']) field(name).value = result.address[name] ?? '';
      selection = { source:'google', placeId:prediction.id, proof:result.proof }; search.value = prediction.text; last = search.value;
      status.textContent = result.address.commune ? 'Adres uzupełniony. Sprawdź numer budynku, lokal i pozostałe dane.' : 'Sprawdź adres i uzupełnij brakujące dane, w tym gminę i powiat.';
      form.dispatchEvent(new Event('input')); field('building').focus();
    } catch(error) { if(!(error instanceof DOMException && error.name==='AbortError')) status.textContent = 'Nie udało się pobrać adresu. Wpisz go w polach poniżej.'; }
    finally { token = crypto.randomUUID(); }
  };
  search.addEventListener('input', () => {
    clearTimeout(timer); controller?.abort(); ++version; close(); const query = search.value.trim();
    if(query.length < 3 || query === last) return;
    timer = setTimeout(async () => {
      last = query; const generation = version; controller = new AbortController();
      try { const result = await request('/api/address/suggestions', { input:query, token }, controller.signal); if(generation !== version) return;
        predictions = result.suggestions; list.replaceChildren();
        predictions.forEach((prediction,index) => { const item=document.createElement('li'); item.id=`address-option-${index}`; item.role='option'; item.textContent=prediction.text; item.setAttribute('aria-selected','false'); item.addEventListener('mousedown', event=>event.preventDefault()); item.addEventListener('click',()=>void choose(prediction)); list.append(item); });
        list.hidden = !predictions.length; attribution.hidden = !predictions.length; search.setAttribute('aria-expanded',String(!!predictions.length)); status.textContent = predictions.length ? '' : 'Brak podpowiedzi. Wpisz adres ręcznie.';
      } catch(error) { if(!(error instanceof DOMException && error.name==='AbortError')) { last=''; status.textContent='Podpowiedzi są chwilowo niedostępne. Wpisz adres ręcznie.'; } }
    },350);
  });
  search.addEventListener('keydown', event => {
    if(event.key==='Escape') { controller?.abort(); ++version; close(); }
    if(list.hidden) return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp') { event.preventDefault(); active=(active+(event.key==='ArrowDown'?1:-1)+predictions.length)%predictions.length; Array.from(list.children).forEach((item,index)=>item.setAttribute('aria-selected',String(index===active))); search.setAttribute('aria-activedescendant',`address-option-${active}`); list.children[active]?.scrollIntoView({block:'nearest'}); }
    if(event.key==='Enter' && active>=0) { event.preventDefault(); void choose(predictions[active]); }
  });
  search.addEventListener('blur',close);
  for(const name of ['street','building','postcode','city','commune','county','province']) field(name).addEventListener('input',()=>{ selection={source:'manual'}; });
  if(api) void fetch(`${api}/api/config`).then(res=>res.ok?res.json():null).then(config=>{ container.hidden=!config?.googlePlaces; }).catch(()=>{});
  return { getSelection:()=>selection, reset:()=>{ selection={source:'manual'}; search.value='';last='';token=crypto.randomUUID();close(); } };
}
