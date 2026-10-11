import { statuses, owners, type AdminCase, type CaseStatus } from '../data/admin.ts';
export interface DemoNote { text: string; date: string; }
export interface DemoChange { text: string; date: string; }
export interface DemoState { status: CaseStatus; owner: string; notes: DemoNote[]; history: DemoChange[]; }
export function defaultState(item: AdminCase): DemoState { return {status:item.status,owner:item.owner,notes:[],history:[]}; }
export function parseDemoState(value: string | null, item: AdminCase): DemoState {
  if (!value) return defaultState(item);
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return defaultState(item);
    const p = parsed as Record<string,unknown>;
    if (typeof p.status !== 'string' || !Object.hasOwn(statuses,p.status) || (item.module === 'kontakt' && p.status === 'waiting') || typeof p.owner !== 'string' || !owners.includes(p.owner)) return defaultState(item);
    const validEntries = (v: unknown, limit: number): DemoNote[] => Array.isArray(v) ? v.filter((n): n is DemoNote => !!n && typeof n === 'object' && typeof n.text === 'string' && n.text.length <= 2000 && typeof n.date === 'string' && Number.isFinite(Date.parse(n.date))).slice(-limit) : [];
    return {status:p.status as CaseStatus,owner:p.owner,notes:validEntries(p.notes,20),history:validEntries(p.history,50)};
  } catch { return defaultState(item); }
}
export interface ListFilters { query: string; status: string; subject: string; period: string; }
export function filterCases(items: AdminCase[], states: Map<string,DemoState>, filters: ListFilters): AdminCase[] {
  const normalize = (value: string) => value.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  const query = normalize(filters.query.trim());
  // The demo dataset has a fixed reference day, not the user's current date.
  const earliest = Date.UTC(2026,9,12) - Number(filters.period || 9999)*86400000;
  return items.filter(item => (!filters.status || (states.get(item.id)?.status ?? item.status) === filters.status) && (!filters.subject || item.subject === filters.subject) && Date.parse(item.date) >= earliest && (!query || normalize([item.id,item.client,item.location,item.subject,item.summary,item.message].join(' ')).includes(query)));
}
