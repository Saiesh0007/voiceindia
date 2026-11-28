// Thin wrapper over the browser's Web Speech API (recognition + synthesis).
// No API keys: Chrome, Edge and Safari ship speech recognition built in.

import { LANGS, speakable } from './i18n.js';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const canListen = () => !!SR;
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let active = null; // current recognition session

/**
 * Listen once. Resolves with { alternatives: [text...] } or { error }.
 * opts: lang, onInterim(text), onSpeech(), maxMs
 */
export function listen(lang, opts = {}) {
  stopListening(true);
  return new Promise(resolve => {
    if (!SR) { resolve({ error: 'unsupported' }); return; }
    const rec = new SR();
    rec.lang = (LANGS[lang] || LANGS.hi).speech;
    rec.interimResults = true;
    rec.maxAlternatives = 4;
    rec.continuous = false;

    let finalAlts = null, interim = '', done = false, timer = null;
    const session = { rec, aborted: false };
    active = session;

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (active === session) active = null;
      if (session.aborted) { resolve({ error: 'aborted' }); return; }
      resolve(result);
    };

    rec.onresult = (ev) => {
      let text = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          finalAlts = Array.from(r).map(a => a.transcript.trim()).filter(Boolean);
        } else text += r[0].transcript;
      }
      interim = text || (finalAlts ? finalAlts[0] : interim);
      if (opts.onInterim) opts.onInterim(finalAlts ? finalAlts[0] : interim);
    };
    rec.onspeechstart = () => opts.onSpeech && opts.onSpeech();
    rec.onerror = (ev) => {
      const map = { 'not-allowed': 'denied', 'service-not-allowed': 'denied', network: 'network', 'no-speech': 'nospeech', aborted: 'aborted', 'audio-capture': 'denied' };
      // keep anything we already heard
      if ((finalAlts || interim) && ev.error !== 'not-allowed') return;
      finish({ error: map[ev.error] || ev.error });
    };
    rec.onend = () => {
      const alts = finalAlts || (interim.trim() ? [interim.trim()] : null);
      finish(alts ? { alternatives: alts } : { error: 'nospeech' });
    };
    session.finish = finish;
    try { rec.start(); } catch (e) { finish({ error: 'busy' }); return; }
    if (opts.maxMs) timer = setTimeout(() => { try { rec.stop(); } catch (e) { /* ignore */ } }, opts.maxMs);
  });
}

/** Stop listening. `abort` throws away what was heard; otherwise it's kept. */
export function stopListening(abort = false) {
  const s = active;
  if (!s) return;
  if (abort) {
    s.aborted = true;
    try { s.rec.abort(); } catch (e) { /* ignore */ }
    if (s.finish) s.finish({ error: 'aborted' });
  } else {
    try { s.rec.stop(); } catch (e) { /* ignore */ }
  }
}
export const isListening = () => !!active;

// ---------------------------------------------------------------- speaking
let voices = [];
function loadVoices() { voices = canSpeak() ? speechSynthesis.getVoices() : []; }
if (canSpeak()) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

function pickVoice(lang) {
  const wanted = (LANGS[lang] || LANGS.hi).voice;
  for (const w of wanted) {
    const exact = voices.filter(v => v.lang.replace('_', '-').toLowerCase() === w.toLowerCase());
    if (exact.length) return exact.find(v => /google|natural|online/i.test(v.name)) || exact[0];
  }
  const base = wanted[0].slice(0, 2);
  return voices.find(v => v.lang.toLowerCase().startsWith(base)) || null;
}

/** Speak `text`; resolves when done (or after a safety timeout). */
export function speak(text, lang) {
  return new Promise(resolve => {
    if (!canSpeak() || !text) { resolve(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text, lang));
    const v = pickVoice(lang);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = (LANGS[lang] || LANGS.hi).voice[0];
    u.rate = lang === 'en' ? 1 : 0.95;
    let settled = false;
    const end = () => { if (!settled) { settled = true; clearTimeout(guard); resolve(); } };
    // Chrome sometimes never fires onend; estimate a generous duration.
    const guard = setTimeout(end, 1500 + text.length * 110);
    u.onend = end; u.onerror = end;
    speechSynthesis.speak(u);
  });
}
export function stopSpeaking() { if (canSpeak()) speechSynthesis.cancel(); }

// ---------------------------------------------------------------- chime
let ctx = null;
export function chime(kind = 'ok') {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'ok' ? [660, 990] : [440, 330];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t0 = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t0); o.stop(t0 + 0.25);
    });
  } catch (e) { /* audio blocked: silent is fine */ }
}

export function vibrate(ms = 30) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } }
