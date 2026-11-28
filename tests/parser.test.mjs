// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, parseBest, parseYesNo, parseAmount, parseChoice, parseName, HINDI_COUNT } from '../app/js/parser.js';
import { translit, displayLatin, key } from '../app/js/translit.js';
import { CUSTOMERS, seedState } from '../app/js/data.js';

const C = CUSTOMERS;
const id = name => C.find(c => c.latin === name).id;
const p = text => parseCommand(text, C);

function expectEntry(text, { intent, amount, who, items, isNew }) {
  const r = p(text);
  assert.equal(r.intent, intent, `${text} -> intent ${r.intent}`);
  if (amount !== undefined) assert.equal(r.amount, amount, `${text} -> amount ${r.amount}`);
  if (who) assert.equal(r.customer && r.customer.id, id(who), `${text} -> customer ${r.customer && r.customer.latin}`);
  if (isNew) assert.equal(r.newName && r.newName.latin, isNew, `${text} -> new ${JSON.stringify(r.newName)}`);
  if (items) assert.deepEqual(r.items, items, `${text} -> items ${r.items}`);
  return r;
}

test('number table is complete', () => assert.equal(HINDI_COUNT, 100));

test('transliteration', () => {
  assert.equal(displayLatin('सुनीता दीदी'), 'Sunita Didi');
  assert.equal(translit('रमेश'), 'ramesh');
  assert.equal(translit('कितना'), 'kitnaa');
  assert.equal(key('सुनीता'), key('Suneeta'));
  assert.equal(key('उधार'), key('udhaar'));
  assert.equal(key('1100'), '1100');
});

test('Hindi credit in Devanagari, with items', () => {
  expectEntry('सुनीता दीदी का 240 उधार लिख दो, आटा और तेल', { intent: 'add_credit', amount: 240, who: 'Sunita didi', items: ['atta', 'oil'] });
});

test('Hinglish credit in Latin script', () => {
  expectEntry('Sunita didi ka 240 udhaar likh do atta aur tel', { intent: 'add_credit', amount: 240, who: 'Sunita didi', items: ['atta', 'oil'] });
});

test('spelling variants and number words', () => {
  expectEntry('Suneeta ji ka do sau chalis likho', { intent: 'add_credit', amount: 240, who: 'Sunita didi' });
  expectEntry('सुनीता दीदी का दो सौ चालीस उधार', { intent: 'add_credit', amount: 240, who: 'Sunita didi' });
  expectEntry('Mohan ji ka dhai sau udhaar', { intent: 'add_credit', amount: 250, who: 'Mohan ji' });
  expectEntry('मोहन जी का साढ़े तीन सौ लिख दो', { intent: 'add_credit', amount: 350, who: 'Mohan ji' });
  expectEntry('vikas ka ek hazaar do sau udhaar', { intent: 'add_credit', amount: 1200, who: 'Vikas' });
  expectEntry('Vikas ka ₹1,140 likh do', { intent: 'add_credit', amount: 1140, who: 'Vikas' });
});

test('"do" as a verb is not the number two', () => {
  const r = expectEntry('सुनीता दीदी का 240 लिख दो', { intent: 'add_credit', amount: 240 });
  assert.equal(r.amount, 240);
});

test('quantities are not amounts', () => {
  expectEntry('मोहन जी दो किलो चावल 120 रुपये', { intent: 'add_credit', amount: 120, who: 'Mohan ji', items: ['rice'] });
  const r = p('Sunita didi do kilo atta');
  assert.equal(r.amount, null);
});

test('payments', () => {
  expectEntry('रमेश भैया ने 500 जमा किए', { intent: 'add_payment', amount: 500, who: 'Ramesh bhaiya' });
  expectEntry('Ramesh Soni ne paanch sau diye', { intent: 'add_payment', amount: 500, who: 'Ramesh Soni' });
  expectEntry('Ramesh Soni paid 500', { intent: 'add_payment', amount: 500, who: 'Ramesh Soni' });
});

test('giving TO a customer is credit, giving BY a customer is payment', () => {
  expectEntry('vikas ko 300 ka saman diya', { intent: 'add_credit', amount: 300, who: 'Vikas' });
  expectEntry('vikas ne 300 diye', { intent: 'add_payment', amount: 300, who: 'Vikas' });
});

test('two customers called Ramesh -> ask which one', () => {
  const r = p('रमेश ने 500 जमा किए');
  assert.equal(r.intent, 'add_payment');
  assert.equal(r.customer, null);
  assert.deepEqual(r.candidates.map(c => c.latin).sort(), ['Ramesh Soni', 'Ramesh bhaiya']);
  expectEntry('दूधवाले रमेश का 300 उधार', { intent: 'add_credit', amount: 300, who: 'Ramesh bhaiya' });
});

test('Marathi', () => {
  expectEntry('आशा ताईंच्या नावावर 300 उधार लिहा', { intent: 'add_credit', amount: 300, who: 'Asha tai' });
  expectEntry('गणेश पाटील यांनी 500 रुपये जमा केले', { intent: 'add_payment', amount: 500, who: 'Ganesh Patil' });
  expectEntry('सुनीताताईंनी पाचशे दिले', { intent: 'add_payment', amount: 500, who: 'Sunita didi' });
  expectEntry('मोहन जी दीड हजार उधार', { intent: 'add_credit', amount: 1500, who: 'Mohan ji' });
  expectEntry('आशा ताईंचे किती बाकी आहे', { intent: 'check_balance', who: 'Asha tai' });
});

test('English', () => {
  expectEntry('Add 240 credit for Sunita', { intent: 'add_credit', amount: 240, who: 'Sunita didi' });
  expectEntry('Fatima two hundred and forty credit', { intent: 'add_credit', amount: 240, who: 'Fatima bi' });
  expectEntry('Fatima two forty udhaar', { intent: 'add_credit', amount: 240, who: 'Fatima bi' });
  expectEntry('How much does Sunita owe', { intent: 'check_balance', who: 'Sunita didi' });
});

test('new customer', () => {
  expectEntry('Kavita ka dhai sau udhaar', { intent: 'add_credit', amount: 250, isNew: 'Kavita' });
  const r = expectEntry('कविता जी का 180 उधार', { intent: 'add_credit', amount: 180 });
  assert.equal(r.newName.name, 'कविता जी');
});

test('missing parts are reported, not guessed', () => {
  const noAmt = p('सुनीता दीदी का उधार लिख दो');
  assert.equal(noAmt.intent, 'add_credit');
  assert.equal(noAmt.amount, null);
  const noName = p('240 उधार लिख दो');
  assert.equal(noName.customer, null);
  assert.equal(noName.newName, null);
  assert.equal(noName.amount, 240);
});

test('questions, summary, reminders, undo', () => {
  expectEntry('सुनीता का कितना बाकी है?', { intent: 'check_balance', who: 'Sunita didi' });
  expectEntry('Sunita ka kitna baaki hai', { intent: 'check_balance', who: 'Sunita didi' });
  expectEntry('आज कितना उधार दिया', { intent: 'daily_summary' });
  expectEntry('आज का हिसाब', { intent: 'daily_summary' });
  expectEntry('सबको रिमाइंडर भेज दो', { intent: 'send_reminders' });
  expectEntry('sabko reminder bhej do', { intent: 'send_reminders' });
  expectEntry('सगळ्यांना आठवण पाठवा', { intent: 'send_reminders' });
  expectEntry('गलत हो गया', { intent: 'undo' });
  expectEntry('galat ho gaya, wapas lo', { intent: 'undo' });
  expectEntry('Sunita didi', { intent: 'check_balance', who: 'Sunita didi' });
  assert.equal(p('मौसम कैसा है').intent, 'unknown');
});

test('N-best: a complete alternative beats an incomplete first guess', () => {
  const r = parseBest(['सुनीता दीदी का उधार', 'सुनीता दीदी का 240 उधार'], C);
  assert.equal(r.amount, 240);
});

test('yes / no', () => {
  for (const y of ['हाँ', 'haan likh do', 'हो', 'होय', 'ठीक है', 'yes', 'sahi hai', 'बरोबर']) assert.equal(parseYesNo(y), 'yes', y);
  for (const n of ['नहीं', 'nahi', 'सही नहीं है', 'नको', 'no', 'गलत', 'नाही']) assert.equal(parseYesNo(n), 'no', n);
  assert.equal(parseYesNo('सुनीता'), null);
});

test('amount on its own', () => {
  assert.equal(parseAmount('दो सौ चालीस'), 240);
  assert.equal(parseAmount('240 रुपये'), 240);
  assert.equal(parseAmount('do'), 2);
  assert.equal(parseAmount('पाचशे'), 500);
  assert.equal(parseAmount('कुछ नहीं'), null);
});

test('choosing between options', () => {
  const opts = [C.find(c => c.id === 'c4'), C.find(c => c.id === 'c7')];
  assert.equal(parseChoice('दो', opts), 1);
  assert.equal(parseChoice('पहला', opts), 0);
  assert.equal(parseChoice('दूधवाले', opts), 0);
  assert.equal(parseChoice('सोनी', opts), 1);
  assert.equal(parseChoice('ek', opts), 0);
});

test('name on its own', () => {
  assert.equal(parseName('सुनीता दीदी', C).customer.id, 'c2');
  assert.equal(parseName('रमेश', C).candidates.length, 2);
  assert.equal(parseName('Kavita', C).newName.latin, 'Kavita');
});

test('demo data matches the Figma screens', () => {
  const s = seedState(Date.UTC(2026, 10, 28, 10));
  const bal = cid => s.entries.filter(e => e.cid === cid).reduce((a, e) => a + (e.type === 'credit' ? e.amount : -e.amount), 0);
  assert.equal(s.customers.length, 8);
  assert.equal(bal('c2'), 900);
  assert.equal(s.customers.reduce((a, c) => a + bal(c.id), 0), 6260);
});
