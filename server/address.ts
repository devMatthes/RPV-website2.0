import { googleAddress, parsePrg, type GoogleComponent } from '../src/lib/service-address.ts';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ServiceAddress } from '../src/lib/service-schema.ts';
export class AddressError extends Error { statusCode: number; constructor(message: string, statusCode = 503) { super(message); this.statusCode=statusCode; } }
export function addressSignature(address: Partial<ServiceAddress>, secret: string) { return createHmac('sha256',secret).update(JSON.stringify(['street','building','postcode','city','commune','county','province','placeId'].map(key=>address[key as keyof ServiceAddress] ?? ''))).digest('hex'); }
export function verifyAddressProof(address: ServiceAddress, proof: unknown, secret: string): string | undefined {
  if(typeof proof !== 'string') return; const [teryt,signature]=proof.split('.');
  if(!/^\d{7}$/.test(teryt ?? '') || !/^[a-f0-9]{64}$/.test(signature ?? '')) return;
  const expected = createHmac('sha256',secret).update(`${teryt}.${addressSignature(address,secret)}`).digest();
  if(timingSafeEqual(expected,Buffer.from(signature,'hex'))) return teryt;
}
export function placesAdapter(options: { key?: string; secret: string; consume: () => boolean; fetcher?: typeof fetch }) {
  const fetcher=options.fetcher ?? fetch;
  const sessions=new Map<string,{ owner:string; expires:number; ids:Set<string>; calls:number }>();
  const validToken=(token:unknown): token is string => typeof token==='string' && /^[a-f0-9-]{36}$/.test(token);
  const googleFetch=async (url:string,init:RequestInit, mask:string)=>{
    if(!options.key) throw new AddressError('Podpowiedzi nie są jeszcze włączone.');
    if(!options.consume()) throw new AddressError('Limit podpowiedzi osiągnięty. Wpisz adres ręcznie.',429);
    const response=await fetcher(url,{...init,headers:{'Content-Type':'application/json','X-Goog-Api-Key':options.key,'X-Goog-FieldMask':mask},signal:AbortSignal.timeout(6000)});
    if(!response.ok) throw new AddressError('Podpowiedzi są chwilowo niedostępne.'); return response.json();
  };
  return {
    async suggest(input: unknown, token: unknown, owner:string) {
      if(typeof input!=='string'||input.trim().length<3||input.length>200||!validToken(token)) throw new AddressError('Niepoprawne zapytanie.',400);
      for(const [key,value] of sessions) if(value.expires<Date.now()) sessions.delete(key);
      if(sessions.size>1000 && !sessions.has(token)) throw new AddressError('Wpisz adres ręcznie.',429);
      const session=sessions.get(token) ?? {owner,expires:Date.now()+10*60_000,ids:new Set<string>(),calls:0};
      if(session.owner!==owner||session.calls>=20) throw new AddressError('Rozpocznij nowe wyszukiwanie.',429);
      sessions.set(token,session); session.calls++;
      const result=await googleFetch('https://places.googleapis.com/v1/places:autocomplete',{method:'POST',body:JSON.stringify({input:input.trim(),sessionToken:token,languageCode:'pl',includedRegionCodes:['pl']})},'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text');
      const suggestions=(result.suggestions ?? []).filter((item: {placePrediction?: unknown})=>item.placePrediction).slice(0,5).map((item: {placePrediction:{placeId:string;text:{text:string}}})=>({id:item.placePrediction.placeId,text:item.placePrediction.text.text}));
      for(const item of suggestions) session.ids.add(item.id);
      return {suggestions};
    },
    async details(id:unknown,token:unknown,owner:string) {
      const session=validToken(token)?sessions.get(token):undefined;
      if(typeof id!=='string'||!session||session.owner!==owner||session.expires<Date.now()||!session.ids.has(id)) throw new AddressError('Wybierz adres z aktualnej listy.',400);
      sessions.delete(token as string);
      const result: {addressComponents:GoogleComponent[];location?:{latitude:number;longitude:number}}=await googleFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=pl&sessionToken=${encodeURIComponent(token as string)}`,{},'addressComponents,location');
      const address=googleAddress(result.addressComponents,id);
      if(result.location) {
        try { const url=new URL('https://uldk.gugik.gov.pl/');url.searchParams.set('request','GetCommuneByXY');url.searchParams.set('xy',`${result.location.longitude},${result.location.latitude},4326`);url.searchParams.set('result','teryt,commune,county,voivodeship');const response=await fetcher(url,{signal:AbortSignal.timeout(4000)});const prg=response.ok?parsePrg(await response.text()):undefined;if(prg) Object.assign(address,prg); } catch { /* User can complete administrative fields manually. */ }
      }
      const proof=address.teryt?`${address.teryt}.${createHmac('sha256',options.secret).update(`${address.teryt}.${addressSignature(address,options.secret)}`).digest('hex')}`:undefined;
      return {address,proof};
    },
  };
}
