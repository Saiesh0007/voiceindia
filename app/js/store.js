// The ledger lives on the phone (localStorage), so it works offline and
// nothing leaves the device unless the shopkeeper sends a reminder.

import { seedState } from './data.js';
import { displayLatin, isDevanagari } from './translit.js';

const KEY = 'bolokhata.v1';
const DAY = 86400000;
let state = null;

function safeGet() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
}
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: keep in memory */ }
}

export function load() {
  const saved = safeGet();
  state = saved && saved.version === 1 ? saved : seedState();
  if (!saved) persist();
  return state;
}
export function get() { return state || load(); }

export function resetDemo() {
  const keep = { lang: get().lang, voiceReplies: get().voiceReplies };
  state = { ...seedState(), ...keep };
  persist();
}

export const customer = id => get().customers.find(c => c.id === id) || null;
export const entriesOf = id => get().entries.filter(e => e.cid === id).sort((a, b) => b.at - a.at);

export function balance(id) {
  return get().entries.reduce((a, e) => (e.cid !== id ? a : a + (e.type === 'credit' ? e.amount : -e.amount)), 0);
}

/** Days since the current unpaid run began (balance went from 0 to positive). */
export function dueDays(id, now = Date.now()) {
  const list = get().entries.filter(e => e.cid === id).sort((a, b) => a.at - b.at);
  let bal = 0, start = null;
  for (const e of list) {
    const before = bal;
    bal += e.type === 'credit' ? e.amount : -e.amount;
    if (before <= 0 && bal > 0) start = e.at;
    if (bal <= 0) start = null;
  }
  if (start === null) return null;
  const d0 = new Date(start); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(now); d1.setHours(0, 0, 0, 0);
  return Math.round((d1 - d0) / DAY);
}

export function remindedDays(id, now = Date.now()) {
  const ts = get().reminded[id];
  if (!ts) return null;
  const d0 = new Date(ts); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(now); d1.setHours(0, 0, 0, 0);
  return Math.round((d1 - d0) / DAY);
}

export function dueList() {
  return get().customers
    .map(c => ({ c, bal: balance(c.id), days: dueDays(c.id) }))
    .filter(x => x.bal > 0)
    .sort((a, b) => (b.days || 0) - (a.days || 0) || b.bal - a.bal);
}

export function todayTotals(now = Date.now()) {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  let credit = 0, paid = 0, count = 0;
  for (const e of get().entries) {
    if (e.at < d0.getTime()) continue;
    count++;
    if (e.type === 'credit') credit += e.amount; else paid += e.amount;
  }
  return { credit, paid, count };
}

export function addCustomer({ name, latin }, lang) {
  const s = get();
  const id = 'c' + Date.now().toString(36);
  const c = { id, name, latin: latin || (isDevanagari(name) ? displayLatin(name) : name), lang: lang || s.lang || 'hi', phone: '', added: true };
  s.customers.push(c);
  persist();
  return c;
}

export function addEntry({ cid, type, amount, items, via, transcript }) {
  const s = get();
  const e = { id: 'e' + (++s.seq), cid, type, amount, items: items || [], at: Date.now(), via: via || 'voice', transcript: transcript || '' };
  s.entries.push(e);
  persist();
  return e;
}

export function updateEntry(id, patch) {
  const e = get().entries.find(x => x.id === id);
  if (e) Object.assign(e, patch);
  persist();
  return e;
}

export function removeEntry(id) {
  const s = get();
  const i = s.entries.findIndex(x => x.id === id);
  const [gone] = i >= 0 ? s.entries.splice(i, 1) : [null];
  // A brand-new customer whose only entry was undone goes too.
  const owner = gone && s.customers.find(c => c.id === gone.cid);
  if (owner && owner.added && !s.entries.some(e => e.cid === gone.cid)) {
    s.customers = s.customers.filter(c => c.id !== gone.cid);
  }
  persist();
  return gone;
}

/** Most recent entry made in this app (not demo seed data from earlier days). */
export function lastEntry() {
  const list = get().entries.slice().sort((a, b) => b.at - a.at);
  return list[0] || null;
}

export function markReminded(id) { get().reminded[id] = Date.now(); persist(); }
export function setPref(k, v) { get()[k] = v; persist(); }
export function setShop(patch) { Object.assign(get().shop, patch); persist(); }

/** Typical credit size, used to flag amounts that are probably misheard. */
export function typicalCredit(id) {
  const xs = get().entries.filter(e => e.cid === id && e.type === 'credit').map(e => e.amount).sort((a, b) => a - b);
  if (xs.length < 3) return null;
  return xs[Math.floor(xs.length / 2)];
}
