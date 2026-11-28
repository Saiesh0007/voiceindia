// Understands one spoken khata sentence in Hindi, Marathi, Hinglish or English.
// Runs fully in the browser with no API keys: tokens are reduced to phonetic
// keys (see translit.js), then numbers, intent, customer and items are found
// with keyword lists and fuzzy name matching.

import { key, translit, displayLatin, isDevanagari, editDistance } from './translit.js';
import { ITEMS } from './data.js';

const set = list => new Set(list.map(key).filter(Boolean));

// ------------------------------------------------------------------ numbers
const HINDI = ['shunya', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chhah', 'saat', 'aath', 'nau', 'das',
  'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnees', 'bees',
  'ikkees', 'baais', 'teis', 'chaubees', 'pachchees', 'chhabbees', 'sattaais', 'atthaais', 'untees', 'tees',
  'iktees', 'battees', 'taintees', 'chautees', 'paintees', 'chhattees', 'saintees', 'adtees', 'untaalees', 'chaalees',
  'iktaalees', 'bayaalees', 'taintaalees', 'chauvaalees', 'paintaalees', 'chhiyaalees', 'saintaalees', 'adtaalees', 'unchaas', 'pachaas',
  'ikyaavan', 'baavan', 'tirpan', 'chauvan', 'pachpan', 'chhappan', 'sattaavan', 'atthaavan', 'unsath', 'saath',
  'iksath', 'baasath', 'tirsath', 'chausath', 'painsath', 'chhiyaasath', 'sadsath', 'adsath', 'unhattar', 'sattar',
  'ikhattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhihattar', 'sathattar', 'athhattar', 'unaasi', 'assi',
  'ikyaasi', 'bayaasi', 'tiraasi', 'chauraasi', 'pachaasi', 'chhiyaasi', 'sattaasi', 'atthaasi', 'navaasi', 'nabbe',
  'ikyaanave', 'baanave', 'tiraanave', 'chauraanave', 'pachaanave', 'chhiyaanave', 'sattaanave', 'atthaanave', 'ninyaanave'];
export const HINDI_COUNT = HINDI.length;

const EXTRA_NUM = {
  // Hindi spelling variants and Devanagari forms whose transliteration differs
  ik: 1, ekk: 1, दो: 2, तीन: 3, char: 4, panch: 5, पाँच: 5, पांच: 5, chhe: 6, छह: 6, छः: 6, sat: 7, ath: 8, dus: 10,
  gyarah: 11, barah: 12, pandra: 15, bis: 20, tis: 30, chalis: 40, pachas: 50, sath: 60, sattar: 70, assi: 80, nabbe: 90,
  पच्चीस: 25, पैंतीस: 35, चालीस: 40, पैंतालीस: 45, पचास: 50, साठ: 60, सत्तर: 70, अस्सी: 80, नब्बे: 90,
  // Marathi
  don: 2, दोन: 2, paach: 5, पाच: 5, saha: 6, सहा: 6, daha: 10, दहा: 10, akra: 11, bara: 12, tera: 13,
  chauda: 14, pandhra: 15, सोळा: 16, sola: 16, satra: 17, athra: 18, ekonis: 19, vees: 20, वीस: 20, panchvees: 25, पंचवीस: 25,
  pannas: 50, पन्नास: 50, ainshi: 80, ऐंशी: 80, navvad: 90, नव्वद: 90,
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};
const NUM = new Map();
HINDI.forEach((w, i) => NUM.set(key(w), i));
for (const [w, v] of Object.entries(EXTRA_NUM)) NUM.set(key(w), v);

const MULT = new Map();
for (const [w, v] of Object.entries({
  sau: 100, सौ: 100, so: 100, hundred: 100, shambhar: 100, शंभर: 100,
  hazaar: 1000, hazar: 1000, hajar: 1000, हज़ार: 1000, हजार: 1000, thousand: 1000,
  lakh: 100000, lac: 100000, लाख: 100000
})) MULT.set(key(w), v);

const FRAC = new Map();
for (const [w, v] of Object.entries({
  dhai: 'x2.5', dhaai: 'x2.5', ढाई: 'x2.5', adich: 'x2.5', अडीच: 'x2.5',
  dedh: 'x1.5', derh: 'x1.5', डेढ़: 'x1.5', deed: 'x1.5', दीड: 'x1.5',
  sadhe: '+0.5', saadhe: '+0.5', साढ़े: '+0.5', साढे: '+0.5', saade: '+0.5', साडे: '+0.5',
  paune: '-0.25', पौने: '-0.25', pavne: '-0.25', पावणे: '-0.25',
  sava: '+0.25', savva: '+0.25', सवा: '+0.25'
})) FRAC.set(key(w), v);

// Words that are numbers only when next to another number word or "rupees".
const AMBIGUOUS_NUM = set(['do', 'so', 'saath', 'sath', 'one', 'char', 'sat', 'tis', 'bis', 'das', 'ath']);
const JOIN = set(['and', 'aur']);
const CURRENCY = set(['rupaye', 'rupaiye', 'rupay', 'rupaya', 'rupye', 'rupees', 'rupee', 'rs', 'rupiya', 'रुपये', 'रुपए', 'रुपया', 'रूपये', 'रुपयांचे', 'रुपयांची', 'inr']);
const UNIT = set(['kilo', 'kg', 'kilogram', 'kgs', 'gram', 'gm', 'grams', 'litre', 'liter', 'ltr', 'packet', 'paket', 'pkt', 'packets',
  'dozen', 'darjan', 'piece', 'pieces', 'pc', 'bori', 'bag', 'bottle', 'botal', 'किलो', 'लीटर', 'लिटर', 'पैकेट', 'पाकीट', 'दर्जन', 'डझन',
  'ग्राम', 'बोतल', 'बाटली', 'नग', 'पुडा', 'पुड़िया']);

// ------------------------------------------------------------------ keywords
const CREDIT = set(['udhaar', 'udhar', 'udhari', 'udaar', 'udhaari', 'उधार', 'उधारी', 'credit', 'likh', 'likho', 'likhna', 'likhdo',
  'likha', 'likhiye', 'लिख', 'लिखो', 'लिखना', 'लिखिए', 'लिखा', 'liha', 'lihun', 'लिहा', 'लिहून', 'मांडा', 'khate', 'khata', 'खाते', 'खाता',
  'owe', 'owes', 'add', 'saman', 'samaan', 'सामान', 'सौदा']);
const PAYMENT = set(['jama', 'jamaa', 'जमा', 'payment', 'paid', 'pay', 'chukaya', 'chukaye', 'chuka', 'चुकाया', 'चुकाए', 'wapas', 'vapas',
  'waapas', 'वापस', 'lautaye', 'लौटाए', 'mile', 'mila', 'मिले', 'मिला', 'bhare', 'bharle', 'भरे', 'भरले', 'parat', 'परत', 'received', 'returned']);
const GIVE = set(['diye', 'diya', 'die', 'de', 'dedi', 'dediye', 'दिए', 'दिये', 'दिया', 'दे', 'dile', 'दिले', 'dila', 'दिला', 'gave', 'given']);
const TAKE = set(['liya', 'liye', 'lie', 'लिया', 'लिए', 'liye', 'gaya', 'ghetle', 'ghetla', 'घेतले', 'घेतला', 'nele', 'नेले', 'uthaya', 'उठाया', 'took', 'bought']);
const AGENT = set(['ne', 'ने']);
const DATIVE = set(['ko', 'को', 'la', 'ला', 'to']);
const QUESTION = set(['kitna', 'kitne', 'kitni', 'कितना', 'कितने', 'कितनी', 'kiti', 'किती', 'balance', 'how', 'much', 'hisab', 'hisaab', 'हिसाब',
  'हिशोब', 'hishob', 'kya', 'क्या', 'batao', 'बताओ', 'बताइए', 'sanga', 'सांगा', 'due', 'owe', 'owes', 'shillak', 'शिल्लक', 'summary']);
const SUMMARY = set(['aaj', 'aj', 'आज', 'today', 'total', 'kul', 'कुल', 'ekun', 'एकूण', 'din', 'दिन', 'sab', 'sabka', 'सबका', 'saglyanche', 'सगळ्यांचे']);
const REMIND = set(['reminder', 'reminders', 'remind', 'रिमाइंडर', 'रिमाइंडर्स', 'yaad', 'याद', 'message', 'messages', 'मैसेज', 'मेसेज', 'sandesh',
  'संदेश', 'aathavan', 'आठवण', 'whatsapp', 'व्हाट्सएप', 'व्हॉट्सॲप']);
const UNDO = set(['galat', 'गलत', 'galti', 'गलती', 'undo', 'mitao', 'mita', 'मिटाओ', 'मिटा', 'hatao', 'hata', 'हटाओ', 'हटा', 'cancel', 'कैंसल',
  'chuk', 'chook', 'चूक', 'radd', 'रद्द', 'kadhun', 'काढून', 'delete', 'remove']);
const TAKE_BACK = set(['lo', 'lelo', 'le', 'लो', 'ले', 'घ्या']);

const YES = set(['haan', 'han', 'haa', 'ha', 'हाँ', 'हां', 'हा', 'ho', 'हो', 'hoy', 'होय', 'yes', 'yeah', 'yep', 'yup', 'sahi', 'सही', 'theek',
  'thik', 'ठीक', 'bilkul', 'बिलकुल', 'बिल्कुल', 'ok', 'okay', 'okey', 'ओके', 'correct', 'right', 'barobar', 'बरोबर', 'chalega', 'चलेगा',
  'likh', 'likho', 'लिखो', 'लिख', 'liha', 'लिहा', 'done', 'pakka', 'पक्का', 'confirm', 'save', 'jee', 'ji']);
const NO = set(['nahi', 'nahin', 'nai', 'na', 'नहीं', 'नही', 'ना', 'no', 'nope', 'nako', 'नको', 'nahi', 'नाही', 'galat', 'गलत', 'cancel',
  'mat', 'मत', 'ruko', 'रुको', 'stop', 'wrong', 'radd', 'रद्द', 'chuk', 'चूक']);
const ORDINAL = [
  set(['ek', 'एक', 'pehla', 'pahla', 'pehle', 'पहला', 'पहले', 'pahila', 'पहिला', 'first', 'one', '1']),
  set(['do', 'दो', 'dusra', 'doosra', 'दूसरा', 'दूसरे', 'dusre', 'don', 'दोन', 'दुसरा', 'second', 'two', '2']),
  set(['teen', 'तीन', 'teesra', 'tisra', 'तीसरा', 'तिसरा', 'third', 'three', '3']),
  set(['chaar', 'चार', 'chautha', 'चौथा', 'fourth', 'four', '4'])
];

const HONORIFIC = set(['didi', 'di', 'दीदी', 'bhaiya', 'bhaiyya', 'bhayya', 'भैया', 'भैय्या', 'bhai', 'भाई', 'bhau', 'भाऊ', 'ji', 'jee', 'जी',
  'tai', 'ताई', 'kaka', 'काका', 'kaki', 'काकी', 'chacha', 'चाचा', 'chachi', 'चाची', 'mausi', 'मौसी', 'mama', 'मामा', 'mami', 'मामी', 'aunty',
  'auntie', 'uncle', 'sahab', 'saheb', 'साहब', 'साहेब', 'seth', 'सेठ', 'bai', 'बाई', 'bi', 'बी', 'bhabhi', 'भाभी', 'dada', 'दादा', 'amma',
  'अम्मा', 'anna', 'अण्णा', 'akka', 'अक्का', 'rao', 'राव', 'madam', 'sir']);

const STOP = set(['ka', 'ki', 'ke', 'ko', 'ne', 'se', 'par', 'pe', 'me', 'mein', 'men', 'main', 'mai', 'hai', 'hain', 'he', 'tha', 'thi', 'the',
  'ho', 'hua', 'hui', 'hue', 'gaya', 'gayi', 'gaye', 'gae', 'kar', 'karo', 'kardo', 'karna', 'kariye', 'kijiye', 'kie', 'kiye', 'kiya', 'karde',
  'do', 'de', 'dena', 'dedo', 'diya', 'diye', 'die', 'dijiye', 'dijie', 'lo', 'le', 'lena', 'lelo', 'aur', 'and', 'ani', 'आणि', 'va', 'or', 'bhi',
  'abhi', 'jara', 'zara', 'please', 'plz', 'pls', 'naam', 'nam', 'name', 'naame', 'नाम', 'नामे', 'the', 'a', 'an', 'of', 'for', 'to', 'from',
  'by', 'at', 'in', 'on', 'is', 'was', 'has', 'have', 'entry', 'एंट्री', 'yah', 'ye', 'yeh', 'woh', 'wo', 'us', 'unka', 'uska', 'unki', 'mera',
  'mere', 'apna', 'sab', 'sabko', 'sabhi', 'सबको', 'सभी', 'kal', 'कल', 'ok', 'abhi', 'अभी', 'bhej', 'bhejo', 'भेज', 'भेजो', 'भेजें', 'send',
  'aaya', 'aaye', 'aya', 'aye', 'आया', 'आए', 'gaya', 'गया', 'गए', 'गई', 'hissab', 'wala', 'wale', 'wali', 'वाला', 'वाले', 'वाली', 'ab', 'अब',
  'cha', 'chi', 'che', 'chya', 'ची', 'चा', 'चे', 'च्या', 'var', 'वर', 'madhe', 'मध्ये', 'ahe', 'aahe', 'आहे', 'hote', 'hota', 'होते', 'होता',
  'zhale', 'jhale', 'झाले', 'kele', 'केले', 'keli', 'केली', 'kara', 'करा', 'ghya', 'घ्या', 'dya', 'द्या', 'yanni', 'यांनी', 'yanchi', 'यांची',
  'yanche', 'यांचे', 'yancha', 'यांचा', 'yanna', 'यांना', 'tyanchi', 'tyanna', 'navavar', 'नावावर', 'navane', 'नावाने', 'nav', 'नाव',
  'sagle', 'sagla', 'sagalyanna', 'सगळ्यांना', 'सगळे', 'pathva', 'पाठवा', 'pathav', 'पाठव', 'mala', 'मला', 'mujhe', 'मुझे', 'humko',
  'karke', 'करके', 'करो', 'कर', 'कीजिए', 'किए', 'किया', 'किये', 'दो', 'दे', 'दीजिए', 'है', 'हैं', 'था', 'थे', 'थी', 'का', 'की', 'के', 'से',
  'पर', 'पे', 'में', 'और', 'भी', 'वो', 'यह', 'ये', 'आज', 'baaki', 'baki', 'बाकी', 'बाक़ी', 'hisaab', 'add', 'credit', 'payment', 'paid']);

const ITEM_BY_KEY = new Map();
for (const [id, it] of Object.entries(ITEMS)) for (const w of it.words) ITEM_BY_KEY.set(key(w), id);

const NOT_NAME = (k) => STOP.has(k) || CREDIT.has(k) || PAYMENT.has(k) || GIVE.has(k) || TAKE.has(k) || QUESTION.has(k) ||
  SUMMARY.has(k) || REMIND.has(k) || UNDO.has(k) || CURRENCY.has(k) || UNIT.has(k) || ITEM_BY_KEY.has(k) || YES.has(k) || NO.has(k) ||
  NUM.has(k) || MULT.has(k) || FRAC.has(k) || JOIN.has(k);

// ------------------------------------------------------------------ tokenise
export function tokenize(text) {
  const t = String(text || '')
    .replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966))
    .replace(/₹/g, ' ₹ ')
    .replace(/(\d),(?=\d)/g, '$1')          // 1,140 -> 1140
    .replace(/(\d)\/-/g, '$1')               // 240/- -> 240
    .replace(/(\d)([^\d\s.])/g, '$1 $2')     // 240rs -> 240 rs
    .replace(/([^\d\s.₹])(\d)/g, '$1 $2')    // rs240 -> rs 240
    .replace(/[?!,;:।॥"“”'‘’()\[\]{}\-–—]/g, ' ');
  return t.split(/\s+/).filter(Boolean).map(raw => ({ raw, key: raw === '₹' ? '₹' : key(raw) })).filter(x => x.key);
}

function classify(tokens, allowAmbiguous) {
  const cls = tokens.map(t => {
    const k = t.key;
    if (k === '₹' || CURRENCY.has(k)) return { kind: 'cur' };
    if (/^\d+(\.\d+)?$/.test(t.raw.replace(/\.$/, ''))) return { kind: 'num', v: parseFloat(t.raw), digit: true };
    if (MULT.has(k)) return { kind: 'mult', v: MULT.get(k), weak: k === 'so' };
    if (FRAC.has(k)) return { kind: 'frac', op: FRAC.get(k) };
    if (NUM.has(k)) return { kind: 'num', v: NUM.get(k), amb: AMBIGUOUS_NUM.has(k) };
    // Marathi hundreds glued with "शे": दोनशे = 200, पाचशे = 500
    if (k.length > 3 && k.endsWith('se')) {
      const base = k.slice(0, -2);
      if (NUM.has(base) && NUM.get(base) < 10) return { kind: 'num', v: NUM.get(base) * 100 };
    }
    if (UNIT.has(k)) return { kind: 'unit' };
    if (JOIN.has(k)) return { kind: 'join' };
    return { kind: 'word' };
  });
  // Ambiguous number words ("do" in "likh do") count only next to other numbers.
  const isNumish = c => c && (c.kind === 'num' && !c.amb || c.kind === 'mult' && !c.weak || c.kind === 'frac' || c.kind === 'cur');
  for (let i = 0; i < cls.length; i++) {
    const c = cls[i];
    if (c.kind === 'num' && c.amb && !allowAmbiguous) {
      if (!(isNumish(cls[i + 1]) || isNumish(cls[i - 1]) || (cls[i + 1] && cls[i + 1].kind === 'unit'))) cls[i] = { kind: 'word' };
      else c.amb = false;
    }
    if (c.kind === 'mult' && c.weak) {
      const p = cls[i - 1];
      if (!(p && (p.kind === 'num' || p.kind === 'frac'))) cls[i] = { kind: 'word' };
    }
  }
  return cls;
}

function numberGroups(tokens, cls) {
  const groups = [];
  let i = 0;
  while (i < cls.length) {
    const c = cls[i];
    if (!(c.kind === 'num' || c.kind === 'mult' || c.kind === 'frac')) { i++; continue; }
    const start = i;
    let total = 0, cur = 0, pending = null, lastNum = false, digit = false, used = 0;
    while (i < cls.length) {
      const x = cls[i];
      if (x.kind === 'join' && cls[i + 1] && (cls[i + 1].kind === 'num') && used) { i++; continue; }
      if (x.kind === 'num') {
        // Two number groups glued: "240 500" -> stop at the second digit token
        if (x.digit && used && lastNum) break;
        let v = x.v;
        if (pending) { v = applyFrac(pending, v); pending = null; }
        if (x.digit) digit = true;
        if (lastNum && cur > 0 && cur < 10 && v >= 10 && v < 100) cur = cur * 100 + v; // "two forty" -> 240
        else cur += v;
        lastNum = true;
      } else if (x.kind === 'frac') {
        if (x.op.startsWith('x')) { cur += parseFloat(x.op.slice(1)); lastNum = false; }
        else pending = x.op;
      } else if (x.kind === 'mult') {
        if (x.v === 100) cur = (cur || 1) * 100;
        else { total += (cur || 1) * x.v; cur = 0; }
        lastNum = false;
      } else break;
      used++; i++;
    }
    const value = Math.round((total + cur) * 100) / 100;
    const before = cls[start - 1], after = cls[i];
    groups.push({
      value, digit, start, end: i,
      unit: !!(after && after.kind === 'unit'),
      currency: !!((after && after.kind === 'cur') || (before && before.kind === 'cur'))
    });
  }
  return groups;
}

function applyFrac(op, v) {
  if (op === '+0.5') return v + 0.5;
  if (op === '-0.25') return v - 0.25;
  if (op === '+0.25') return v + 0.25;
  return v;
}

function pickAmount(groups) {
  const usable = groups.filter(g => !g.unit && g.value > 0);
  if (!usable.length) return null;
  const cur = usable.filter(g => g.currency);
  const pool = cur.length ? cur : usable;
  return pool.reduce((a, b) => (b.value > a.value ? b : a));
}

// ------------------------------------------------------------------ customers
function customerTokens(c) {
  const toks = s => String(s || '').split(/\s+/).filter(Boolean);
  const nameParts = toks(c.name), latinParts = toks(c.latin);
  const core = [], extra = [];
  const add = (arr, word) => { const k = key(word); if (k && !arr.includes(k)) arr.push(k); };
  nameParts.forEach((w, i) => (HONORIFIC.has(key(w)) ? add(extra, w) : add(core, w)));
  latinParts.forEach((w) => (HONORIFIC.has(key(w)) ? add(extra, w) : add(core, w)));
  toks(c.note).concat(toks(c.noteLatin)).forEach(w => add(extra, w));
  // Given name = first core token in either script (they reduce to the same key)
  const given = core.length ? [core[0]] : [];
  return { given, core, extra };
}

function tokenMatches(tk, nk) {
  if (!tk || !nk) return Infinity;
  if (tk === nk) return 0;
  if (nk.length >= 4 && tk.startsWith(nk)) return 0.5; // Marathi suffixes: रमेशला, सुनीताताईंनी
  const d = editDistance(tk, nk);
  const allowed = nk.length >= 8 ? 2 : nk.length >= 4 ? 1 : 0;
  return d <= allowed ? d : Infinity;
}

/** Find which customers a set of tokens refers to. Returns { best, candidates, used } */
export function matchCustomers(tokens, customers) {
  const results = [];
  for (const c of customers) {
    const { given, core, extra } = customerTokens(c);
    if (!given.length) continue;
    const used = new Set();
    let dist = 0;
    const findTok = (nk) => {
      let best = -1, bd = Infinity;
      tokens.forEach((t, i) => {
        if (used.has(i) || NOT_NAME(t.key) && !HONORIFIC.has(t.key) && t.key !== nk) return;
        const d = tokenMatches(t.key, nk);
        if (d < bd) { bd = d; best = i; }
      });
      return best >= 0 ? { i: best, d: bd } : null;
    };
    const g = findTok(given[0]);
    if (!g) continue;
    used.add(g.i); dist += g.d;
    let score = 1;
    for (const nk of core.slice(1).concat(extra)) {
      if (nk === given[0]) continue;
      const m = findTok(nk);
      if (m) { used.add(m.i); dist += m.d; score++; }
    }
    results.push({ customer: c, score, dist, used });
  }
  if (!results.length) return { best: null, candidates: [], used: new Set() };
  results.sort((a, b) => b.score - a.score || a.dist - b.dist);
  const top = results[0];
  const ties = results.filter(r => r.score === top.score && r.dist === top.dist);
  // Same given name and nothing else to tell them apart -> ask which one
  if (ties.length > 1) return { best: null, candidates: ties.map(r => r.customer), used: top.used, dist: top.dist };
  return { best: top.customer, candidates: [top.customer], used: top.used, dist: top.dist };
}

function extractNewName(tokens, cls, skip) {
  let run = [];
  const runs = [];
  tokens.forEach((t, i) => {
    const isName = cls[i].kind === 'word' && !skip.has(i) && !NOT_NAME(t.key) && t.key.length > 1;
    const isHon = cls[i].kind === 'word' && !skip.has(i) && HONORIFIC.has(t.key);
    if (isName || (isHon && run.length)) run.push(t);
    else { if (run.length) runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);
  for (let r of runs) {
    while (r.length && HONORIFIC.has(r[0].key)) r = r.slice(1);
    if (r.length && r.some(t => !HONORIFIC.has(t.key))) {
      r = r.slice(0, 3);
      const raw = r.map(t => t.raw).join(' ');
      const pretty = isDevanagari(raw) ? raw : raw.replace(/(^|\s)(\S)/g, (m, s, c) => s + c.toUpperCase());
      return { name: pretty, latin: isDevanagari(raw) ? displayLatin(raw) : pretty };
    }
  }
  return null;
}

// ------------------------------------------------------------------ main parse
/**
 * Parse one command.
 * @returns {{intent, amount, customer, candidates, newName, items, confidence, transcript, explicit}}
 */
export function parseCommand(text, customers) {
  const tokens = tokenize(text);
  const cls = classify(tokens, false);
  const keys = tokens.map(t => t.key);
  const has = s => keys.some(k => s.has(k));
  const count = s => keys.filter(k => s.has(k)).length;

  const groups = numberGroups(tokens, cls);
  const amountGroup = pickAmount(groups);
  const amount = amountGroup ? amountGroup.value : null;
  const numIdx = new Set();
  groups.forEach(g => { for (let i = g.start; i < g.end; i++) numIdx.add(i); });

  // customer: match against tokens that aren't part of a number
  const nameTokens = tokens.map((t, i) => (numIdx.has(i) ? { raw: '', key: '' } : t));
  const match = matchCustomers(nameTokens, customers);
  const newName = match.candidates.length ? null : extractNewName(tokens, cls, numIdx);

  const items = [];
  keys.forEach((k, i) => {
    const id = ITEM_BY_KEY.get(k);
    if (id && !items.includes(id) && !(match.used && match.used.has(i))) items.push(id);
  });

  // intent
  let credit = 3 * count(CREDIT), payment = 3 * count(PAYMENT);
  const give = has(GIVE), take = has(TAKE);
  if (give) { if (has(DATIVE)) credit += 2; else payment += 2; }
  if (take) credit += 2;
  if (has(AGENT) && give) payment += 1;
  // "credit"/"udhaar" mentioned alongside "jama" -> "jama" wins only if stronger
  const takeBack = keys.some((k, i) => (k === key('wapas') || k === key('vapas') || k === key('वापस')) && TAKE_BACK.has(keys[i + 1] || ''));
  const undo = (has(UNDO) || takeBack) && amount === null;
  const remind = has(REMIND);
  const question = has(QUESTION);
  const summary = has(SUMMARY);
  const customer = match.best;

  let intent = 'unknown', explicit = false;
  if (undo) { intent = 'undo'; explicit = true; }
  else if (remind && amount === null) { intent = 'send_reminders'; explicit = true; }
  else if (amount === null && (question || (summary && !customer && !match.candidates.length))) {
    if (customer || match.candidates.length > 1) intent = 'check_balance';
    else if (newName && !summary) intent = 'check_balance';
    else intent = 'daily_summary';
    explicit = true;
  } else if (credit > 0 || payment > 0 || amount !== null) {
    intent = payment > credit ? 'add_payment' : 'add_credit';
    explicit = credit > 0 || payment > 0;
  } else if (customer || match.candidates.length > 1) {
    intent = 'check_balance';
  }

  let confidence = 0.3;
  if (explicit) confidence += 0.3;
  if (amount !== null) confidence += amountGroup.digit || amountGroup.currency || amountGroup.end - amountGroup.start > 1 ? 0.2 : 0.15;
  if (customer) confidence += match.dist === 0 ? 0.2 : 0.1;
  else if (newName) confidence += 0.05;
  if (intent === 'unknown') confidence = Math.min(confidence, 0.3);

  return {
    intent,
    amount,
    customer: customer || null,
    candidates: customer ? [] : match.candidates,
    newName: customer || match.candidates.length ? null : newName,
    items,
    confidence: Math.min(1, Math.round(confidence * 100) / 100),
    explicit,
    transcript: String(text || '').trim()
  };
}

/** Pick the best parse among recogniser alternatives (N-best list). */
export function parseBest(alternatives, customers) {
  const rank = { add_credit: 3, add_payment: 3, check_balance: 2, daily_summary: 2, send_reminders: 2, undo: 2, unknown: 0 };
  let best = null, bestScore = -1;
  alternatives.filter(Boolean).forEach((t, i) => {
    const p = parseCommand(t, customers);
    const complete = (p.intent === 'add_credit' || p.intent === 'add_payment') ? (p.amount !== null) + !!(p.customer || p.newName) : 0;
    const score = rank[p.intent] + complete * 0.5 + p.confidence - i * 0.05;
    if (score > bestScore) { best = p; bestScore = score; }
  });
  return best || parseCommand('', customers);
}

// ------------------------------------------------------------------ short replies
/** "haan" / "nahi" -> 'yes' | 'no' | null. "No" wins when both appear ("sahi nahi"). */
export function parseYesNo(text) {
  const keys = tokenize(text).map(t => t.key);
  if (keys.some(k => NO.has(k))) return 'no';
  if (keys.some(k => YES.has(k))) return 'yes';
  return null;
}

/** Amount on its own ("do sau chalis", "₹240", "240"). Ambiguous words allowed. */
export function parseAmount(text) {
  const tokens = tokenize(text);
  const g = pickAmount(numberGroups(tokens, classify(tokens, true)));
  return g ? g.value : null;
}

/** Choice among numbered options: "do" -> 1, "pehla" -> 0, or a name that fits one option. */
export function parseChoice(text, options) {
  const tokens = tokenize(text);
  const keys = tokens.map(t => t.key);
  if (options && options.length) {
    // Score each option by the words that set it apart ("दूधवाले", "सोनी"),
    // ignoring the given name they share.
    const parts = options.map(customerTokens);
    const shared = parts.map(p => p.given[0]);
    const scores = parts.map(p => {
      const own = p.core.concat(p.extra).filter(k => !shared.includes(k));
      return own.filter(nk => tokens.some(t => tokenMatches(t.key, nk) !== Infinity)).length;
    });
    const max = Math.max(...scores);
    if (max > 0 && scores.filter(s => s === max).length === 1) return scores.indexOf(max);
  }
  for (let i = 0; i < ORDINAL.length; i++) if (keys.some(k => ORDINAL[i].has(k))) return i;
  if (parseYesNo(text) === 'no') return -1;
  return null;
}

/** A name on its own: existing customer(s) or a new name. */
export function parseName(text, customers) {
  const tokens = tokenize(text);
  const m = matchCustomers(tokens, customers);
  if (m.best) return { customer: m.best, candidates: [] };
  if (m.candidates.length) return { customer: null, candidates: m.candidates };
  const cls = classify(tokens, false);
  return { customer: null, candidates: [], newName: extractNewName(tokens, cls, new Set()) };
}

export { translit, key };
