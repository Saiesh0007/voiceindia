// Bolo Khata — the voice flow and screens.
// One core loop: speak -> understand -> read back -> "haan" -> saved.

import * as S from './store.js';
import { t, LANGS, money, dateLabel } from './i18n.js';
import { parseBest, parseYesNo, parseAmount, parseChoice, parseName } from './parser.js';
import * as V from './voice.js';

const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));

const lang = () => S.get().lang || 'hi';
let L = t('hi');
const nm = c => (c ? (lang() === 'en' ? c.latin || c.name : c.name) : '');
const firstWord = c => nm(c).split(/\s+/)[0];

const ui = { view: 'home', cid: null, flash: null, remind: { picked: null, queue: null, idx: 0 } };
const flow = { pending: null, failures: 0, token: 0, sheet: null };
const BIG = 5000;

// ---------------------------------------------------------------- icons
const P = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>',
  keypad: '<circle cx="6" cy="6" r="1.4"/><circle cx="12" cy="6" r="1.4"/><circle cx="18" cy="6" r="1.4"/><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/><circle cx="6" cy="18" r="1.4"/><circle cx="12" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h1M10.5 10h1M14.5 10h1M7 14h10"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  up: '<path d="M7 17 17 7M9 7h8v8"/>',
  down: '<path d="M17 7 7 17M15 17H7V9"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>'
};
const icon = (n, size = 24, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const bars = n => `<span class="bars" aria-hidden="true">${'<b></b>'.repeat(n)}</span>`;

const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
function initial(s) {
  const str = String(s || '?').trim();
  if (seg) { const it = seg.segment(str)[Symbol.iterator]().next(); return it.value ? it.value.segment.toUpperCase() : '?'; }
  return str.slice(0, 1).toUpperCase();
}
const avatar = (c, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initial(nm(c)))}</span>`;

// ---------------------------------------------------------------- speaking + status
function announce(text) { const el = $('#live'); el.textContent = ''; setTimeout(() => { el.textContent = text; }, 30); }
async function say(text) {
  announce(text);
  if (S.get().voiceReplies) await V.speak(text, lang());
}

let toastTimer = null;
function toast(msg, kind = 'ok', opts = {}) {
  const el = $('#toast');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span class="tick">${icon(kind === 'ok' ? 'check' : 'alert', 18, 2.6)}</span><span class="msg">${esc(msg)}</span>` +
    (opts.undo ? `<button data-act="undo-entry" data-id="${esc(opts.undo)}">${esc(L.undo)}</button>` : '');
  requestAnimationFrame(() => el.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), opts.undo ? 7000 : 4200);
}

// ---------------------------------------------------------------- render
function render() {
  L = t(lang());
  document.documentElement.lang = lang() === 'en' ? 'en-IN' : lang();
  const app = $('#app');
  const s = S.get();
  if (!s.lang) { app.className = 'app no-dock'; app.innerHTML = viewOnboard(); return; }
  if (ui.view === 'customer' && !S.customer(ui.cid)) ui.view = 'home';
  const html = ui.view === 'customer' ? viewCustomer() : ui.view === 'reminders' ? viewReminders() : viewHome();
  const dock = ui.view === 'reminders' ? '' : viewDock();
  app.className = 'app' + (ui.view === 'reminders' ? ' no-dock' : '');
  app.innerHTML = html + dock;
  if (ui.flash) {
    const el = app.querySelector(`[data-flash="${ui.flash}"]`);
    if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    ui.flash = null;
  }
}

function viewOnboard() {
  const langs = Object.entries(LANGS).map(([k, v]) =>
    `<button class="lang-btn" data-act="set-lang" data-lang="${k}"><strong>${esc(v.label)}</strong><small>${esc(v.hint)}</small></button>`).join('');
  return `<div class="onboard">
    <span class="logo">${icon('mic', 36, 2.2)}</span>
    <h1>बोलो खाता</h1>
    <p class="tag">बोलिए, खाते में लिख जाएगा · Say it, it’s saved</p>
    <h2>अपनी भाषा चुनें · Choose your language</h2>
    <p class="sub">भाषा बाद में बदल सकते हैं</p>
    ${langs}
    <button class="lang-btn soon" disabled aria-disabled="true"><strong>தமிழ் · বাংলা</strong><small>जल्द · soon</small></button>
    <p class="privacy">${icon('lock', 18)} हिसाब सिर्फ़ इसी फ़ोन में रहता है · Your ledger stays on this phone</p>
  </div>`;
}

function viewHome() {
  const s = S.get();
  const tt = S.todayTotals();
  const due = S.dueList();
  const total = due.reduce((a, x) => a + x.bal, 0);
  const dueIds = new Set(due.map(x => x.c.id));
  const settled = s.customers.filter(c => !dueIds.has(c.id));
  const anyToRemind = due.some(x => S.remindedDays(x.c.id) !== 0);
  const row = ({ c, bal, days }) => {
    const late = days !== null && days >= 21;
    const meta = [c.note && (lang() === 'en' ? c.noteLatin || c.note : c.note), bal > 0 ? L.since(days || 0) : L.noDue].filter(Boolean).join(' · ');
    return `<li><button class="row" data-act="open" data-id="${c.id}" data-flash="c-${c.id}">
      ${avatar(c)}<span class="info"><span class="name">${esc(nm(c))}</span><span class="meta ${late ? 'late' : ''}">${esc(meta)}</span></span>
      <span class="amt num ${bal === 0 ? 'zero' : bal < 0 ? 'adv' : ''}">${bal === 0 ? '—' : money(bal)}</span></button></li>`;
  };
  return `<header class="top">
      <div class="brand"><span class="logo">${icon('mic', 24, 2.2)}</span><div><h1>${esc(lang() === 'en' ? s.shop.latin || s.shop.name : s.shop.name)}</h1><p>${esc(L.appName)}</p></div></div>
      <div class="top-actions">
        <button class="icon-btn" data-act="reminders" aria-label="${esc(L.remindersTitle)}">${icon('bell')}${anyToRemind ? '<span class="dot"></span>' : ''}</button>
        <button class="icon-btn" data-act="settings" aria-label="${esc(L.settings)}">${icon('gear', 22)}</button>
      </div>
    </header>
    <section class="tiles" aria-label="${esc(L.today)}">
      <div class="tile udhaar" data-tile="credit"><span class="label">${icon('up', 18, 2.4)}${esc(L.todayCredit)}</span><strong class="num">${money(tt.credit)}</strong></div>
      <div class="tile jama" data-tile="paid"><span class="label">${icon('down', 18, 2.4)}${esc(L.todayPaid)}</span><strong class="num">${money(tt.paid)}</strong></div>
    </section>
    <section class="section">
      <div class="list-head"><h2>${esc(L.dues)}</h2><span>${esc(L.totalLine('', due.length)).replace(/^(\S*)\s?/, (m, w) => esc(w) + ' <b class="num">' + money(total) + '</b> ')}</span></div>
      ${due.length ? `<ul class="card list">${due.map(row).join('')}</ul>` : `<div class="card empty">${esc(L.noDue)}</div>`}
      ${settled.length ? `<p class="settled-head">${esc(L.noDue)}</p><ul class="card list">${settled.map(c => row({ c, bal: S.balance(c.id), days: null })).join('')}</ul>` : ''}
    </section>`;
}

function viewDock() {
  return `<div class="dock">
    <button class="side" data-act="type"><span>${icon('keyboard', 26)}</span><span>${esc(L.type)}</span></button>
    <div class="mic-wrap"><button class="mic" id="mic" aria-label="${esc(L.holdToTalk)}">${icon('mic', 40, 2.2)}</button><span>${esc(L.holdToTalk)}</span></div>
    <button class="side" data-act="manual"><span>${icon('keypad', 26)}</span><span>${esc(L.keypad)}</span></button>
  </div>`;
}

function viewCustomer() {
  const c = S.customer(ui.cid);
  const bal = S.balance(c.id), days = S.dueDays(c.id);
  const list = S.entriesOf(c.id);
  // running balance after each entry (list is newest first)
  let run = bal;
  const rows = list.map(e => {
    const after = run;
    run -= e.type === 'credit' ? e.amount : -e.amount;
    const items = e.items.map(L.item).join(', ');
    const title = (e.type === 'credit' ? L.credit : L.payment) + (items ? ' · ' + items : '');
    const via = L.via[e.via] || '';
    return `<li><button class="entry" data-act="edit" data-id="${e.id}" data-flash="e-${e.id}">
      <span class="dir ${e.type}">${icon(e.type === 'credit' ? 'up' : 'down', 20, 2.4)}</span>
      <span class="info"><span class="title">${esc(title)}</span><span class="meta">${esc(dateLabel(e.at, lang()))}${via ? ' · ' + esc(via) : ''}</span></span>
      <span class="right"><span class="amt num ${e.type}">${e.type === 'credit' ? '+' : '−'}${money(e.amount)}</span><span class="after num">${esc(L.balance)} ${money(after)}</span></span>
    </button></li>`;
  }).join('');
  const r = S.remindedDays(c.id);
  return `<div class="sub-top"><button class="back" data-act="home" aria-label="${esc(L.back)}">${icon('back', 26)}</button><h1>${esc(nm(c))}</h1></div>
    <section class="hero card">
      ${avatar(c, 'lg')}
      <div class="who">${esc(nm(c))}</div>
      ${c.note ? `<div class="note">${esc(lang() === 'en' ? c.noteLatin || c.note : c.note)}</div>` : ''}
      <div class="big num ${bal === 0 ? 'zero' : bal < 0 ? 'adv' : ''}" data-flash="bal">${bal === 0 ? esc(L.noDue) : money(bal)}${bal < 0 ? ' ' + esc(L.advance) : ''}</div>
      ${bal > 0 ? `<div class="since">${esc(L.since(days || 0))}${r !== null ? ' · ' + esc(r === 0 ? L.remindedToday : L.remindedAgo(r)) : ''}</div>
      <button class="btn whatsapp full" data-act="remind-one" data-id="${c.id}">${icon('send', 22)}${esc(L.remindSingle)}</button>` : ''}
    </section>
    <section class="section">
      <div class="list-head"><h2>${esc(L.history)}</h2><span>${esc(L.tapToEdit)}</span></div>
      <ul class="card list">${rows || `<li class="empty">—</li>`}</ul>
    </section>`;
}

function viewReminders() {
  const s = S.get();
  const due = S.dueList();
  if (!ui.remind.picked) ui.remind.picked = new Set(due.filter(x => S.remindedDays(x.c.id) !== 0).map(x => x.c.id));
  const picked = ui.remind.picked;
  const chosen = due.filter(x => picked.has(x.c.id));
  const sum = chosen.reduce((a, x) => a + x.bal, 0);
  const q = ui.remind.queue;
  const rows = due.map(({ c, bal, days }) => {
    const r = S.remindedDays(c.id);
    const on = picked.has(c.id);
    const meta = r === 0 ? L.remindedToday : r !== null ? L.remindedAgo(r) : L.since(days || 0);
    return `<li><button class="remind-row" role="checkbox" aria-checked="${on}" data-act="toggle-remind" data-id="${c.id}">
      <span class="box">${on ? icon('check', 18, 3) : ''}</span>
      <span class="info"><span class="name">${esc(nm(c))}</span><span class="meta ${r === 0 ? 'sent' : ''}">${esc(meta)}</span></span>
      <span class="amt num">${money(bal)}</span></button></li>`;
  }).join('');
  const sample = chosen[0] || due[0];
  let btn;
  if (q && ui.remind.idx >= q.length) btn = `<button class="btn success full" data-act="home">${icon('check', 24, 2.6)}${esc(L.allSent)}</button>`;
  else if (q) { const c = S.customer(q[ui.remind.idx]); btn = `<button class="btn whatsapp full" data-act="send-next">${icon('send', 22)}${esc(L.next(nm(c), ui.remind.idx + 1, q.length))}</button>`; }
  else btn = `<button class="btn whatsapp full" data-act="send-start" ${chosen.length ? '' : 'disabled'}>${icon('send', 22)}${esc(L.send(chosen.length))}</button>`;
  return `<div class="sub-top"><button class="back" data-act="home" aria-label="${esc(L.back)}">${icon('back', 26)}</button><h1>${esc(L.remindersTitle)}</h1></div>
    <section class="section" style="padding-top:6px">
      <p class="sub" style="margin:0 4px 12px;color:var(--muted)">${esc(L.remindHint)}</p>
      ${due.length ? `<ul class="card list">${rows}</ul>` : `<div class="card empty">${esc(L.noDue)}</div>`}
      <label class="field"><span>${esc(L.upiId)}</span>
        <input class="input" id="upi" inputmode="email" autocomplete="off" spellcheck="false" placeholder="${esc(L.upiPlaceholder)}" value="${esc(s.shop.upi)}">
        ${s.shop.upi ? '' : `<small>${esc(L.upiMissing)}</small>`}</label>
      ${sample ? `<p class="preview-label">${esc(nm(sample.c))}</p><div class="preview">${esc(reminderText(sample.c, sample.bal))}</div>` : ''}
      <div style="height:150px"></div>
    </section>
    <div class="sticky-foot"><p class="num">${esc(L.selected(chosen.length, money(sum)))}</p>${btn}</div>`;
}

// ---------------------------------------------------------------- reminders
function upiLink(amount) {
  const s = S.get();
  if (!s.shop.upi) return '';
  const q = new URLSearchParams({ pa: s.shop.upi, pn: s.shop.latin || s.shop.name, am: String(amount), cu: 'INR', tn: 'Bolo Khata' });
  return 'upi://pay?' + q.toString();
}
function reminderText(c, bal) {
  const s = S.get();
  const cl = c.lang && t(c.lang) ? c.lang : lang();
  const shop = cl === 'en' ? s.shop.latin || s.shop.name : s.shop.name;
  const name = cl === 'en' ? c.latin || c.name : c.name;
  return t(cl).reminderMsg(name, bal, shop, s.shop.upi, upiLink(bal));
}
function openWhatsApp(c) {
  const text = reminderText(c, S.balance(c.id));
  const phone = (c.phone || '').replace(/\D/g, '');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  S.markReminded(c.id);
}

// ---------------------------------------------------------------- listening overlay
function showListen() {
  const el = $('#listen');
  el.innerHTML = `<div class="listen-inner">
    <p class="status"><span class="rec"></span><span id="l-status">${esc(L.listening)}</span></p>
    <p class="transcript placeholder" id="l-text">${esc(L.examples[0])}…</p>
    <div class="chips" id="l-chips"></div>
    <div class="stage"><div class="pulse"><i></i><i></i><i></i>
      <button class="mic" data-act="stop-listen" aria-label="${esc(L.tapToStop)}">${icon('mic', 48, 2.2)}</button></div></div>
    ${bars(7)}
    <p class="hint">${esc(L.tapToStop)}</p>
    <div class="row-actions"><button data-act="cancel-listen">${esc(L.cancel)}</button></div>
  </div>`;
  el.classList.remove('hearing');
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('on'));
}
function hideListen() {
  const el = $('#listen');
  el.classList.remove('on', 'hearing');
  setTimeout(() => { if (!el.classList.contains('on')) el.hidden = true; }, 250);
}
function setTranscript(text) {
  const el = $('#l-text');
  if (!el || !text) return;
  el.classList.remove('placeholder');
  el.textContent = '“' + text + '”';
}
function showChips(p) {
  const el = $('#l-chips');
  if (!el) return;
  const chips = [];
  const who = p.customer ? nm(p.customer) : p.newName ? (lang() === 'en' ? p.newName.latin : p.newName.name) : p.candidates.length ? firstWord(p.candidates[0]) : null;
  if (who) chips.push([L.customer, who, '#fff']);
  if (p.amount !== null) chips.push([L.amount, money(p.amount), p.intent === 'add_payment' ? '#BFE3CF' : '#FFB4A8']);
  if (p.intent === 'add_credit' || p.intent === 'add_payment') chips.push(['', p.intent === 'add_credit' ? L.credit : L.payment, '#fff']);
  el.innerHTML = chips.map(([k, v, c], i) => `<span class="chip" style="animation-delay:${i * 90}ms">${k ? `<small>${esc(k)}</small>` : ''}<strong style="color:${c}">${esc(v)}</strong></span>`).join('');
}

// ---------------------------------------------------------------- main command
let holding = false, downAt = 0;

async function startCommand() {
  if (!V.canListen()) { toast(L.noSpeech, 'warn'); openType(); return; }
  V.stopSpeaking();
  closeSheet(true);
  const my = ++flow.token;
  showListen();
  const res = await V.listen(lang(), {
    onInterim: setTranscript,
    onSpeech: () => $('#listen').classList.add('hearing')
  });
  if (my !== flow.token) return;
  if (res.error) { hideListen(); return listenError(res.error); }
  const parsed = parseBest(res.alternatives, S.get().customers);
  setTranscript(parsed.transcript || res.alternatives[0]);
  const st = $('#l-status'); if (st) st.textContent = L.understood;
  showChips(parsed);
  $('#listen').classList.remove('hearing');
  await wait(parsed.intent === 'unknown' ? 300 : 750);
  if (my !== flow.token) return;
  hideListen();
  handleParsed(parsed, 'voice');
}

function listenError(err) {
  if (err === 'aborted' || err === 'busy') return;
  if (err === 'denied') { toast(L.micDenied, 'warn'); openType(); }
  else if (err === 'network') { toast(L.netErr, 'warn'); openType(); }
  else if (err === 'unsupported') { toast(L.noSpeech, 'warn'); openType(); }
  else { toast(L.heardNothing, 'warn'); say(L.heardNothing); }
}

function cancelListening() { flow.token++; V.stopListening(true); }

function handleParsed(p, via) {
  switch (p.intent) {
    case 'add_credit':
    case 'add_payment':
      flow.failures = 0;
      flow.pending = {
        type: p.intent === 'add_credit' ? 'credit' : 'payment',
        cid: p.customer ? p.customer.id : null,
        candidates: p.candidates || [],
        newName: p.newName,
        amount: p.amount,
        items: p.items,
        transcript: p.transcript,
        via
      };
      return proceed();
    case 'check_balance':
      flow.failures = 0;
      if (p.customer) return showBalance(p.customer);
      if (p.candidates.length > 1) { flow.pending = { purpose: 'view', candidates: p.candidates }; return askChoice(); }
      if (p.newName) { const m = L.notFound(lang() === 'en' ? p.newName.latin : p.newName.name); toast(m, 'warn'); return say(m); }
      break;
    case 'daily_summary': flow.failures = 0; return showSummary();
    case 'send_reminders': flow.failures = 0; return openReminders(true);
    case 'undo': flow.failures = 0; return askUndo();
    default: break;
  }
  flow.failures++;
  if (flow.failures >= 2) {
    flow.failures = 0;
    toast(L.notUnderstood2, 'warn');
    say(L.notUnderstood2);
    openType(p.transcript);
  } else {
    toast(L.notUnderstood, 'warn');
    say(L.notUnderstood);
  }
}

function proceed() {
  const p = flow.pending;
  if (!p) return;
  if (!p.cid && !p.newName) return p.candidates && p.candidates.length > 1 ? askChoice() : askName();
  if (p.amount === null || p.amount === undefined) return askAmount();
  return showConfirm();
}

function showBalance(c) {
  ui.view = 'customer'; ui.cid = c.id; ui.flash = 'bal';
  render(); window.scrollTo({ top: 0 });
  say(L.balanceSay(nm(c), S.balance(c.id), S.dueDays(c.id) || 0));
}

// ---------------------------------------------------------------- sheets
function openSheet(html, name) {
  const root = $('#sheet-root');
  const fresh = !root.querySelector('.sheet');
  if (fresh) {
    root.innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-close" data-act="close-sheet" aria-label="${esc(L.close)}">${icon('close', 22)}</button><div class="sheet-body"></div></div>`;
  }
  root.querySelector('.sheet-body').innerHTML = html;
  flow.sheet = name;
  flow.gen = (flow.gen || 0) + 1;
  // Also covers re-opening while the previous sheet is still sliding out.
  const sh = root.querySelector('.sheet'), scrim = root.querySelector('.scrim');
  if (!sh.classList.contains('on')) requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  const h = root.querySelector('.sheet h2');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}
function closeSheet(keepPending) {
  const root = $('#sheet-root');
  if (!root.querySelector('.sheet')) return;
  cancelListening();
  if (!keepPending) flow.pending = null;
  flow.sheet = null;
  root.querySelector('.scrim').classList.remove('on');
  root.querySelector('.sheet').classList.remove('on');
  const gen = flow.gen;
  setTimeout(() => { if (!flow.sheet && flow.gen === gen) root.innerHTML = ''; }, 320);
}

const earHTML = (label) => `<div class="ear" id="ear">${bars(5)}<span id="ear-text">${esc(label)}</span>
  <button class="ear-btn" data-act="ear-listen" aria-label="${esc(L.holdToTalk)}">${icon('mic', 22, 2.2)}</button></div>`;
function setEar(on, text) {
  const el = $('#ear');
  if (!el) return;
  el.classList.toggle('on', on);
  if (text !== undefined) { const t2 = $('#ear-text'); if (t2) t2.innerHTML = text; }
}

/** Speak a prompt, then listen, but only if the same sheet is still open. */
function sayThenListen(line, handler, label) {
  const gen = flow.gen;
  earHandler = handler; earLabel = label;
  // Typed or hand-entered flows don't auto-open the mic; the sheet's mic button still can.
  const spoken = !flow.pending || !flow.pending.via || flow.pending.via === 'voice';
  return say(line).then(() => { if (spoken && gen === flow.gen && flow.sheet) listenInSheet(handler, label); });
}

/** Listen for a short reply inside a sheet; calls handler(alternatives) */
let earHandler = null, earLabel = '';
async function listenInSheet(handler, label) {
  earHandler = handler; earLabel = label;
  if (!V.canListen() || !flow.sheet || flow.micBlocked) return;
  const my = ++flow.token;
  setEar(true, esc(L.listeningShort) + '…');
  const res = await V.listen(lang(), { onInterim: x => setEar(true, `<span class="heard">“${esc(x)}”</span>`), maxMs: 9000 });
  if (my !== flow.token) return;
  setEar(false, esc(label));
  if (res.error) {
    if (res.error === 'denied' || res.error === 'network') {
      flow.micBlocked = true; // don't nag on every step; the buttons still work
      toast(res.error === 'denied' ? L.micDenied : L.netErr, 'warn');
    }
    return;
  }
  handler(res.alternatives);
}

// ---- ask for the missing name
function askName() {
  const p = flow.pending;
  const list = S.get().customers.map(c =>
    `<li><button class="row" data-act="pick-cid" data-id="${c.id}">${avatar(c)}<span class="info"><span class="name">${esc(nm(c))}</span></span><span class="amt num ${S.balance(c.id) ? '' : 'zero'}">${S.balance(c.id) ? money(S.balance(c.id)) : '—'}</span></button></li>`).join('');
  openSheet(`<h2>${esc(L.askName)}</h2>
    <p class="sub">${esc((p.type === 'credit' ? L.credit : L.payment) + (p.amount ? ' · ' + money(p.amount) : ''))}</p>
    ${earHTML(L.orTap)}
    <div class="pick-list"><ul class="list">${list}</ul></div>
    <label class="field"><span>${esc(L.addNew)}</span>
      <div style="display:flex;gap:8px"><input class="input" id="new-name" placeholder="${esc(L.newNamePlaceholder)}" autocomplete="off">
      <button class="btn primary small" data-act="add-new-name">${esc(L.go)}</button></div></label>`, 'name');
  const retry = { n: 0 };
  const handler = (alts) => {
    for (const a of alts) {
      const r = parseName(a, S.get().customers);
      if (r.customer) { p.cid = r.customer.id; return proceed(); }
      if (r.candidates.length > 1) { p.candidates = r.candidates; return askChoice(); }
      if (r.newName) { p.newName = r.newName; return proceed(); }
    }
    if (++retry.n < 2) sayThenListen(L.askName, handler, L.orTap);
  };
  sayThenListen(L.askName, handler, L.orTap);
}

// ---- ask for the missing amount
function askAmount() {
  const p = flow.pending;
  const c = p.cid ? S.customer(p.cid) : null;
  const who = c ? nm(c) : p.newName ? (lang() === 'en' ? p.newName.latin : p.newName.name) : '';
  openSheet(`<h2>${esc(L.askAmount)}</h2>
    <p class="sub">${esc(who + ' · ' + (p.type === 'credit' ? L.credit : L.payment))}</p>
    ${earHTML(L.orTap)}
    <label class="field"><span class="sr-only">${esc(L.amount)}</span>
      <input class="input amount-in num" id="amt" inputmode="numeric" pattern="[0-9]*" placeholder="₹0" autocomplete="off" value="${p.amount ? esc(p.amount) : ''}"></label>
    <div class="actions one"><button class="btn primary full" data-act="amount-go">${esc(L.go)}</button></div>`, 'amount');
  const retry = { n: 0 };
  const handler = (alts) => {
    for (const a of alts) {
      const v = parseAmount(a);
      if (v) { p.amount = v; return proceed(); }
    }
    if (parseYesNo(alts[0]) === 'no') { closeSheet(); return say(L.cancelled); }
    if (++retry.n < 2) sayThenListen(L.askAmount, handler, L.orTap);
  };
  sayThenListen(L.askAmount, handler, L.orTap);
}

// ---- ask which of several people with the same name
function askChoice() {
  const p = flow.pending;
  const opts = p.candidates;
  const given = firstWord(opts[0]);
  const optsHTML = opts.map((c, i) => {
    const bal = S.balance(c.id);
    const last = S.entriesOf(c.id)[0];
    const meta = [c.note && (lang() === 'en' ? c.noteLatin || c.note : c.note), last ? dateLabel(last.at, lang()) : ''].filter(Boolean).join(' · ');
    return `<button class="option" data-act="choose" data-i="${i}"><span class="no">${i + 1}</span>
      <span class="info"><span class="name">${esc(nm(c))}</span><span class="meta">${esc(meta)}</span></span><span class="amt num">${bal ? money(bal) : '—'}</span></button>`;
  }).join('');
  const canAdd = p.purpose !== 'view';
  openSheet(`<h2>${esc(L.whichOne(given))}</h2>
    ${earHTML(L.whichHint)}
    <div class="options">${optsHTML}
      ${canAdd ? `<button class="option" data-act="choose-new"><span class="no plus">+</span><span class="info"><span class="name">${esc(L.newNamed(given))}</span></span></button>` : ''}
    </div>`, 'choice');
  const retry = { n: 0 };
  const handler = (alts) => {
    for (const a of alts) {
      const i = parseChoice(a, opts);
      if (i === -1) { closeSheet(); return say(L.cancelled); }
      if (i !== null && i < opts.length) return choose(i);
    }
    if (++retry.n < 2) sayThenListen(L.whichHint, handler, L.whichHint);
  };
  const names = opts.map((c, i) => `${i + 1}: ${nm(c)}`).join('. ');
  sayThenListen(`${L.whichOne(given)} ${names}.`, handler, L.whichHint);
}
function choose(i) {
  const p = flow.pending;
  const c = p.candidates[i];
  if (p.purpose === 'view') { closeSheet(); return showBalance(c); }
  p.cid = c.id; p.candidates = [];
  proceed();
}

// ---- read back and confirm
function isBig(p) {
  if (p.amount > BIG) return true;
  const typ = p.cid ? S.typicalCredit(p.cid) : null;
  return !!(typ && p.amount > typ * 10);
}

function showConfirm() {
  const p = flow.pending;
  const c = p.cid ? S.customer(p.cid) : null;
  const name = c ? nm(c) : (lang() === 'en' ? p.newName.latin : p.newName.name);
  const before = c ? S.balance(c.id) : 0;
  const after = before + (p.type === 'credit' ? p.amount : -p.amount);
  const items = p.items.map(L.item);
  const stageBig = p.bigAsked && !p.bigOk;
  openSheet(`<div class="confirm ${p.type}">
      <p class="eyebrow">${esc(p.type === 'credit' ? L.confirmCredit : L.confirmPayment)}</p>
      <h2 class="sr-only">${esc(p.type === 'credit' ? L.confirmCredit : L.confirmPayment)}</h2>
      <div class="who">${c ? avatar(c) : `<span class="avatar new" aria-hidden="true">${esc(initial(name))}</span>`}
        <div><div class="n">${esc(name)}</div>${c ? '' : `<span class="badge">${esc(L.newCustomer)}</span>`}</div></div>
      <div class="amount"><strong class="num">${money(p.amount)}</strong><span class="pill ${p.type}">${esc(p.type === 'credit' ? L.credit : L.payment)}</span></div>
      ${items.length ? `<div class="items">${items.map(i => `<span>${esc(i)}</span>`).join('')}</div>` : ''}
      <div class="bal-line"><span>${esc(L.balance)}</span><span class="num">${money(before)} → <b>${money(after)}</b></span></div>
      ${p.transcript && p.via !== 'hand' ? `<p class="said">${esc(L.youSaid)}: <q>${esc(p.transcript)}</q></p>` : ''}
      ${stageBig ? `<div class="warn">${icon('alert', 22)}<span>${esc(L.big(money(p.amount)))}</span></div>` : ''}
      ${earHTML(L.sayYesNo)}
      <div class="actions"><button class="btn secondary" data-act="confirm-no">${icon('close', 24, 2.4)}${esc(L.no)}</button>
        <button class="btn success" data-act="confirm-yes">${icon('check', 26, 2.6)}${esc(stageBig ? L.sureYes : L.yes)}</button></div>
      <div class="fix-row"><button class="link-btn" data-act="flip-type">${esc(L.switchTo(p.type === 'credit' ? L.payment : L.credit))}</button>
        <button class="link-btn" data-act="fix-amount">${esc(L.changeAmount)}</button></div>
    </div>`, 'confirm');

  const retry = { n: 0 };
  const handler = (alts) => {
    const first = alts[0];
    const yn = parseYesNo(first) || alts.map(parseYesNo).find(Boolean) || null;
    const corrected = parseAmount(first);
    if (yn === 'no' && corrected) { p.amount = corrected; p.bigAsked = false; p.bigOk = false; return showConfirm(); }
    if (yn === 'yes') return confirmYes();
    if (yn === 'no') return confirmNo();
    if (++retry.n < 2) sayThenListen(L.sayYesNo, handler, L.sayYesNo);
  };
  const line = stageBig ? L.big(money(p.amount)) : L.readback({ type: p.type, name, amount: p.amount, items, isNew: !c });
  sayThenListen(line, handler, L.sayYesNo);
}

function confirmYes() {
  const p = flow.pending;
  if (!p) return;
  if (isBig(p) && !p.bigOk) {
    if (!p.bigAsked) { p.bigAsked = true; return showConfirm(); }
    p.bigOk = true;
  }
  commit();
}
function confirmNo() {
  closeSheet();
  toast(L.cancelled, 'warn');
  say(L.cancelled);
}

function commit() {
  const p = flow.pending;
  let c = p.cid ? S.customer(p.cid) : null;
  if (!c) c = S.addCustomer(p.newName, lang());
  const e = S.addEntry({ cid: c.id, type: p.type, amount: p.amount, items: p.items, via: p.via, transcript: p.transcript });
  closeSheet();
  V.chime('ok'); V.vibrate(35);
  const bal = S.balance(c.id);
  const msg = L.saved({ type: e.type, name: nm(c) }, bal);
  ui.view = 'customer'; ui.cid = c.id; ui.flash = 'e-' + e.id;
  render(); window.scrollTo({ top: 0 });
  toast(msg, 'ok', { undo: e.id });
  say(msg);
}

// ---- undo the last entry
function askUndo() {
  const e = S.lastEntry();
  if (!e) { toast(L.nothingToUndo, 'warn'); return say(L.nothingToUndo); }
  const c = S.customer(e.cid);
  const desc = L.entryDesc(nm(c), e);
  flow.pending = { purpose: 'undo', entry: e.id };
  openSheet(`<h2>${esc(L.undoAsk(''))}</h2>
    <div class="confirm ${e.type}"><div class="who">${avatar(c)}<div><div class="n">${esc(nm(c))}</div><span class="meta" style="color:var(--muted)">${esc(dateLabel(e.at, lang()))}</span></div></div>
    <div class="amount"><strong class="num">${money(e.amount)}</strong><span class="pill ${e.type}">${esc(e.type === 'credit' ? L.credit : L.payment)}</span></div></div>
    ${earHTML(L.sayYesNo)}
    <div class="actions"><button class="btn secondary" data-act="close-sheet">${esc(L.no)}</button><button class="btn danger" data-act="undo-yes">${esc(L.del)}</button></div>`, 'undo');
  const handler = (alts) => {
    const yn = alts.map(parseYesNo).find(Boolean);
    if (yn === 'yes') return undoYes();
    if (yn === 'no') { closeSheet(); return say(L.cancelled); }
  };
  sayThenListen(L.undoAsk(desc), handler, L.sayYesNo);
}
function undoEntry(id) {
  const e = S.get().entries.find(x => x.id === id);
  if (!e) return;
  const c = S.customer(e.cid);
  const desc = L.entryDesc(nm(c), e);
  S.removeEntry(id);
  V.chime('undo');
  render();
  toast(L.undone(desc), 'warn');
  say(L.undone(desc));
}
function undoYes() { const id = flow.pending && flow.pending.entry; closeSheet(); if (id) undoEntry(id); }

// ---- summary
function showSummary() {
  const tt = S.todayTotals();
  const due = S.dueList();
  const total = due.reduce((a, x) => a + x.bal, 0);
  openSheet(`<h2>${esc(L.summaryTitle)}</h2>
    <div class="summary-grid">
      <div class="tile udhaar"><span class="label">${icon('up', 18, 2.4)}${esc(L.todayCredit)}</span><strong class="num">${money(tt.credit)}</strong></div>
      <div class="tile jama"><span class="label">${icon('down', 18, 2.4)}${esc(L.todayPaid)}</span><strong class="num">${money(tt.paid)}</strong></div>
    </div>
    <div class="summary-total"><span>${esc(L.dueTotal)} · ${due.length}</span><strong class="num">${money(total)}</strong></div>
    <div class="actions one"><button class="btn secondary full" data-act="reminders">${icon('bell')}${esc(L.remindersTitle)}</button></div>`, 'summary');
  say(L.summarySay(tt.credit, tt.paid, total, due.length));
}

function openReminders(spoken) {
  closeSheet();
  ui.view = 'reminders'; ui.remind = { picked: null, queue: null, idx: 0 };
  render(); window.scrollTo({ top: 0 });
  if (spoken) {
    const due = S.dueList().filter(x => ui.remind.picked.has(x.c.id));
    say(L.remindSay(due.length, due.reduce((a, x) => a + x.bal, 0)));
  }
}

// ---- type instead of speaking
function openType(prefill) {
  openSheet(`<h2>${esc(L.typeTitle)}</h2>
    <form data-form="type"><div style="display:flex;gap:8px;margin-top:10px">
      <input class="input" id="type-in" placeholder="${esc(L.typePlaceholder)}" autocomplete="off" value="${esc(prefill || '')}">
      <button class="btn primary small" type="submit">${esc(L.go)}</button></div></form>
    <p class="preview-label">${esc(L.sayLike)}</p>
    <div class="examples">${L.examples.map(x => `<button class="example" data-act="example" data-text="${esc(x)}">${esc(x)}</button>`).join('')}</div>`, 'type');
  setTimeout(() => { const i = $('#type-in'); if (i) i.focus(); }, 340);
}
function submitTyped(text) {
  if (!text || !text.trim()) return;
  closeSheet(true);
  const parsed = parseBest([text.trim()], S.get().customers);
  setTimeout(() => handleParsed(parsed, 'type'), 200);
}

// ---- add by hand
function openManual(state = { type: 'credit', cid: null, q: '', amount: '' }) {
  flow.manual = state;
  const cs = S.get().customers.filter(c => !state.q || (c.name + ' ' + c.latin).toLowerCase().includes(state.q.toLowerCase()));
  const list = cs.map(c => `<li><button class="row" aria-pressed="${state.cid === c.id}" data-act="m-pick" data-id="${c.id}">${avatar(c)}<span class="info"><span class="name">${esc(nm(c))}</span></span><span class="amt num ${S.balance(c.id) ? '' : 'zero'}">${S.balance(c.id) ? money(S.balance(c.id)) : '—'}</span></button></li>`).join('');
  const addNew = state.q && !cs.some(c => nm(c).toLowerCase() === state.q.toLowerCase())
    ? `<li><button class="row" aria-pressed="${state.cid === 'new'}" data-act="m-pick" data-id="new"><span class="avatar new">+</span><span class="info"><span class="name">${esc(L.newNamed(state.q))}</span></span></button></li>` : '';
  openSheet(`<h2>${esc(L.manualTitle)}</h2>
    <div class="seg" style="margin-top:12px" role="group">
      <button class="credit" aria-pressed="${state.type === 'credit'}" data-act="m-type" data-type="credit">${esc(L.credit)}</button>
      <button class="payment" aria-pressed="${state.type === 'payment'}" data-act="m-type" data-type="payment">${esc(L.payment)}</button></div>
    <label class="field"><span>${esc(L.amount)}</span><input class="input amount-in num" id="m-amt" inputmode="numeric" pattern="[0-9]*" placeholder="₹0" value="${esc(state.amount)}" autocomplete="off"></label>
    <label class="field"><span>${esc(L.pickCustomer)}</span><input class="input" id="m-q" placeholder="${esc(L.search)}" value="${esc(state.q)}" autocomplete="off"></label>
    <div class="pick-list"><ul class="list">${addNew}${list}</ul></div>
    <div class="actions one"><button class="btn primary full" data-act="m-go">${esc(L.go)}</button></div>`, 'manual');
}
function manualGo() {
  const m = flow.manual;
  m.amount = ($('#m-amt') || {}).value || m.amount;
  const amount = parseAmount(String(m.amount));
  if (!amount) { $('#m-amt').focus(); return; }
  if (!m.cid) { $('#m-q').focus(); return; }
  flow.pending = {
    type: m.type, amount, items: [], via: 'hand', transcript: '', candidates: [],
    cid: m.cid === 'new' ? null : m.cid,
    newName: m.cid === 'new' ? { name: m.q, latin: m.q } : null
  };
  showConfirm();
}

// ---- edit an entry
function openEdit(id) {
  const e = S.get().entries.find(x => x.id === id);
  if (!e) return;
  flow.edit = { id, type: e.type };
  openSheet(`<h2>${esc(L.edit)}</h2>
    <p class="sub">${esc(dateLabel(e.at, lang()))}${e.items.length ? ' · ' + esc(e.items.map(L.item).join(', ')) : ''}</p>
    <div class="seg" role="group">
      <button class="credit" aria-pressed="${e.type === 'credit'}" data-act="e-type" data-type="credit">${esc(L.credit)}</button>
      <button class="payment" aria-pressed="${e.type === 'payment'}" data-act="e-type" data-type="payment">${esc(L.payment)}</button></div>
    <label class="field"><span>${esc(L.amount)}</span><input class="input amount-in num" id="e-amt" inputmode="numeric" value="${esc(e.amount)}" autocomplete="off"></label>
    ${e.transcript ? `<p class="said">${esc(L.youSaid)}: <q>${esc(e.transcript)}</q></p>` : ''}
    <div class="actions"><button class="btn danger" data-act="e-del">${esc(L.del)}</button><button class="btn primary" data-act="e-save">${esc(L.save)}</button></div>`, 'edit');
}

// ---- settings
function openSettings() {
  const s = S.get();
  const langs = Object.entries(LANGS).map(([k, v]) => `<button aria-pressed="${s.lang === k}" data-act="s-lang" data-lang="${k}">${esc(v.label)}</button>`).join('');
  openSheet(`<h2>${esc(L.settings)}</h2>
    <div class="field"><span>${esc(L.language)}</span><div class="seg three" role="group">${langs}</div></div>
    <label class="field"><span>${esc(L.shopName)}</span><input class="input" id="s-shop" value="${esc(s.shop.name)}" autocomplete="off"></label>
    <label class="field"><span>${esc(L.upiId)}</span><input class="input" id="s-upi" value="${esc(s.shop.upi)}" placeholder="${esc(L.upiPlaceholder)}" inputmode="email" spellcheck="false" autocomplete="off"></label>
    <div class="toggle"><span>${esc(L.voiceReplies)}</span><button class="switch" role="switch" aria-checked="${s.voiceReplies}" data-act="s-voice" aria-label="${esc(L.voiceReplies)}"></button></div>
    <div class="actions"><button class="btn danger" data-act="s-reset">${esc(L.resetDemo)}</button><button class="btn primary" data-act="s-save">${esc(L.save)}</button></div>
    <p class="fineprint">${icon('lock', 14)} ${esc(L.privacy)}</p>`, 'settings');
}

// ---------------------------------------------------------------- events
const actions = {
  'set-lang': el => { S.setPref('lang', el.dataset.lang); L = t(el.dataset.lang); ui.view = 'home'; render(); say(L.tagline); },
  home: () => { closeSheet(); ui.view = 'home'; render(); window.scrollTo({ top: 0 }); },
  open: el => { ui.view = 'customer'; ui.cid = el.dataset.id; render(); window.scrollTo({ top: 0 }); },
  reminders: () => openReminders(false),
  settings: () => openSettings(),
  type: () => openType(),
  manual: () => openManual(),
  'stop-listen': () => V.stopListening(false),
  'cancel-listen': () => { cancelListening(); hideListen(); },
  'close-sheet': () => closeSheet(),
  'ear-listen': () => { if (earHandler && flow.sheet) { V.stopSpeaking(); flow.micBlocked = false; listenInSheet(earHandler, earLabel); } },
  'pick-cid': el => { flow.pending.cid = el.dataset.id; cancelListening(); proceed(); },
  'add-new-name': () => { const v = ($('#new-name') || {}).value; if (v && v.trim()) { flow.pending.newName = { name: v.trim(), latin: v.trim() }; cancelListening(); proceed(); } },
  'amount-go': () => { const v = parseAmount(($('#amt') || {}).value || ''); if (v) { flow.pending.amount = v; cancelListening(); proceed(); } else $('#amt').focus(); },
  choose: el => { cancelListening(); choose(+el.dataset.i); },
  'choose-new': () => { const p = flow.pending; cancelListening(); p.newName = { name: firstWord(p.candidates[0]), latin: p.candidates[0].latin.split(' ')[0] }; p.candidates = []; proceed(); },
  'confirm-yes': () => { cancelListening(); V.stopSpeaking(); confirmYes(); },
  'confirm-no': () => { cancelListening(); V.stopSpeaking(); confirmNo(); },
  'flip-type': () => { const p = flow.pending; cancelListening(); p.type = p.type === 'credit' ? 'payment' : 'credit'; showConfirm(); },
  'fix-amount': () => { cancelListening(); V.stopSpeaking(); askAmount(); },
  'undo-entry': el => { $('#toast').classList.remove('on'); undoEntry(el.dataset.id); },
  'undo-yes': () => { cancelListening(); undoYes(); },
  example: el => submitTyped(el.dataset.text),
  'toggle-remind': el => { const id = el.dataset.id; const pk = ui.remind.picked; pk.has(id) ? pk.delete(id) : pk.add(id); ui.remind.queue = null; ui.remind.idx = 0; render(); },
  'send-start': () => {
    saveUpi();
    ui.remind.queue = S.dueList().filter(x => ui.remind.picked.has(x.c.id)).map(x => x.c.id);
    ui.remind.idx = 0;
    actions['send-next']();
  },
  'send-next': () => {
    const q = ui.remind.queue;
    if (!q || ui.remind.idx >= q.length) return;
    openWhatsApp(S.customer(q[ui.remind.idx]));
    ui.remind.idx++;
    render();
  },
  'remind-one': el => { openWhatsApp(S.customer(el.dataset.id)); render(); },
  'm-type': el => { flow.manual.type = el.dataset.type; flow.manual.amount = $('#m-amt').value; openManual(flow.manual); },
  'm-pick': el => { flow.manual.cid = el.dataset.id; flow.manual.amount = $('#m-amt').value; openManual(flow.manual); },
  'm-go': () => manualGo(),
  'e-type': el => { flow.edit.type = el.dataset.type; document.querySelectorAll('[data-act="e-type"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.type === el.dataset.type)); },
  'e-save': () => {
    const v = parseAmount($('#e-amt').value);
    if (!v) { $('#e-amt').focus(); return; }
    const e = S.updateEntry(flow.edit.id, { amount: v, type: flow.edit.type });
    closeSheet(); ui.flash = 'e-' + e.id; render();
  },
  'e-del': () => { const id = flow.edit.id; closeSheet(); undoEntry(id); },
  's-lang': el => { document.querySelectorAll('[data-act="s-lang"]').forEach(b => b.setAttribute('aria-pressed', b === el)); flow.settingsLang = el.dataset.lang; },
  's-voice': el => { el.setAttribute('aria-checked', el.getAttribute('aria-checked') !== 'true'); },
  's-save': () => {
    const s = S.get();
    const shop = $('#s-shop').value.trim() || s.shop.name;
    S.setShop({ name: shop, latin: shop === s.shop.name ? s.shop.latin : shop, upi: $('#s-upi').value.trim() });
    S.setPref('voiceReplies', $('[data-act="s-voice"]').getAttribute('aria-checked') === 'true');
    if (flow.settingsLang) S.setPref('lang', flow.settingsLang);
    flow.settingsLang = null;
    closeSheet(); render();
  },
  's-reset': () => { if (confirm(L.resetConfirm)) { S.resetDemo(); closeSheet(); ui.view = 'home'; render(); } }
};

function saveUpi() { const i = $('#upi'); if (i) S.setShop({ upi: i.value.trim() }); }

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.id === 'mic') return; // handled by pointer events
  const fn = actions[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el); }
});

document.addEventListener('submit', ev => {
  if (ev.target.dataset.form === 'type') { ev.preventDefault(); submitTyped($('#type-in').value); }
});

document.addEventListener('input', ev => {
  if (ev.target.id === 'm-q') {
    const pos = ev.target.selectionStart;
    flow.manual.q = ev.target.value; flow.manual.amount = $('#m-amt').value;
    openManual(flow.manual);
    const q = $('#m-q'); q.focus(); q.setSelectionRange(pos, pos);
  }
  if (ev.target.id === 'upi') { saveUpi(); }
});
document.addEventListener('change', ev => { if (ev.target.id === 'upi') render(); });

document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter') {
    if (ev.target.id === 'amt') actions['amount-go']();
    if (ev.target.id === 'new-name') actions['add-new-name']();
    if (ev.target.id === 'm-amt') actions['m-go']();
    if (ev.target.id === 'e-amt') actions['e-save']();
  }
  if (ev.key === 'Escape') {
    if ($('#listen').classList.contains('on')) { cancelListening(); hideListen(); }
    else closeSheet();
  }
  // Hold Space to talk (desktop demo)
  if (ev.code === 'Space' && !ev.repeat && !flow.sheet && S.get().lang && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && !$('#listen').classList.contains('on')) {
    ev.preventDefault(); holding = true; downAt = Date.now(); startCommand();
  }
});
document.addEventListener('keyup', ev => {
  if (ev.code === 'Space' && holding) { holding = false; if (Date.now() - downAt > 450) V.stopListening(false); }
});

// Mic: hold to talk, or tap to talk until you stop speaking.
document.addEventListener('pointerdown', ev => {
  const mic = ev.target.closest('#mic');
  if (!mic) return;
  ev.preventDefault();
  holding = true; downAt = Date.now();
  startCommand();
});
const release = () => { if (!holding) return; holding = false; if (Date.now() - downAt > 450) V.stopListening(false); };
document.addEventListener('pointerup', release);
document.addEventListener('pointercancel', release);
document.addEventListener('contextmenu', ev => { if (ev.target.closest('#mic')) ev.preventDefault(); });

// ---------------------------------------------------------------- boot
const params = new URLSearchParams(location.search);
S.load();
if (params.has('reset')) S.resetDemo();
if (params.get('lang') && LANGS[params.get('lang')]) S.setPref('lang', params.get('lang'));
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
