// Devanagari -> Latin transliteration and a phonetic "key" used for matching.
// Hindi and Marathi speech can come back from the recogniser in Devanagari
// ("सुनीता दीदी") or in Latin ("Suneeta didi"). Both are reduced to the same
// key ("sunita") so one set of keyword lists and one customer list work for
// every script and spelling.

const VOWEL = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऍ': 'e', 'ॲ': 'a'
};
const MATRA = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e'
};
const CONS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l',
  // precomposed nukta letters
  'क़': 'k', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z',
  'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'य़': 'y'
};
const NUKTA_OF = { 'क': 'k', 'ख': 'kh', 'ग': 'g', 'ज': 'z', 'ड': 'r', 'ढ': 'rh', 'फ': 'f', 'य': 'y' };
const NUKTA = '़', HALANT = '्', ANUSVARA = 'ं', CANDRABINDU = 'ँ', VISARGA = 'ः';
const LABIAL = /^(p|ph|b|bh|m)$/;

function translitWord(word) {
  const u = []; // units: { c, v, inherent, nasal, raw }
  const chars = Array.from(word);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (CONS[ch] !== undefined) {
      let c = CONS[ch];
      if (chars[i + 1] === NUKTA && NUKTA_OF[ch]) { c = NUKTA_OF[ch]; i++; }
      u.push({ c, v: 'a', inherent: true });
    } else if (MATRA[ch] !== undefined) {
      const last = u[u.length - 1];
      if (last && last.c) { last.v = MATRA[ch]; last.inherent = false; }
      else u.push({ c: '', v: MATRA[ch] });
    } else if (ch === HALANT) {
      const last = u[u.length - 1];
      if (last) { last.v = ''; last.inherent = false; }
    } else if (VOWEL[ch] !== undefined) {
      u.push({ c: '', v: VOWEL[ch] });
    } else if (ch === ANUSVARA || ch === CANDRABINDU) {
      u.push({ nasal: true });
    } else if (ch === VISARGA) {
      u.push({ raw: 'h' });
    } else if (ch >= '०' && ch <= '९') {
      u.push({ raw: String(ch.charCodeAt(0) - 0x0966) });
    } else if (ch === NUKTA || ch === '‌' || ch === '‍') {
      // stray nukta / joiners: ignore
    } else {
      u.push({ raw: ch });
    }
  }

  const syllabic = u.filter(x => x.c !== undefined).length;
  // Final schwa deletion: "रमेश" ramesha -> ramesh
  for (let i = u.length - 1; i >= 0; i--) {
    if (u[i].nasal || u[i].raw === 'h') continue;
    if (u[i].inherent && syllabic > 1) { u[i].v = ''; u[i].inherent = false; }
    break;
  }
  // Medial schwa deletion (V C a C V -> V C C V): "कितना" kitanaa -> kitnaa
  const hasVowel = x => x && x.c !== undefined && x.v !== '';
  for (let i = u.length - 2; i >= 1; i--) {
    const cur = u[i];
    if (!cur.inherent) continue;
    const prev = u[i - 1], next = u[i + 1];
    if (hasVowel(prev) && next && next.c && next.v !== '') {
      cur.v = ''; cur.inherent = false;
    }
  }

  let out = '';
  for (let i = 0; i < u.length; i++) {
    const x = u[i];
    if (x.nasal) {
      const nx = u[i + 1];
      out += nx && nx.c && LABIAL.test(nx.c) ? 'm' : 'n';
    } else if (x.raw !== undefined) out += x.raw;
    else out += (x.c || '') + (x.v || '');
  }
  return out;
}

/** Transliterate any Devanagari runs in `text` to Latin; Latin text passes through. */
export function translit(text) {
  return String(text || '')
    .replace(/।|॥/g, ' ')
    .replace(/[ऀ-ॿ]+/g, translitWord);
}

/** Phonetic key for matching: script- and spelling-insensitive. */
export function key(word) {
  let s = translit(word).toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  s = s.replace(/ee/g, 'i').replace(/oo/g, 'u')
    .replace(/chh/g, 'c').replace(/ch/g, 'c').replace(/sh/g, 's')
    .replace(/ph/g, 'f').replace(/w/g, 'v').replace(/z/g, 'j')
    .replace(/q/g, 'k').replace(/x/g, 'ks');
  return s.replace(/([a-z])\1+/g, '$1');
}

/** Readable Latin form for display, e.g. "सुनीता दीदी" -> "Sunita Didi". */
export function displayLatin(text) {
  const t = translit(text)
    .replace(/aa/g, 'a').replace(/ee/g, 'i').replace(/oo/g, 'u');
  return t.replace(/(^|\s)([a-z])/g, (m, sp, c) => sp + c.toUpperCase());
}

export function isDevanagari(text) { return /[ऀ-ॿ]/.test(text || ''); }

export function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
