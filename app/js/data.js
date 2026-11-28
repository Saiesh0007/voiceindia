// Demo data and the item dictionary. Pure module: no DOM, so tests can import it.
// The demo shop matches the Round 1 Figma screens: Sharma Kirana, 8 customers,
// ₹6,260 due in total, Sunita didi at ₹900 (₹1,140 after the demo entry of ₹240).

export const ITEMS = {
  atta:    { hi: 'आटा', mr: 'पीठ', en: 'flour', words: ['atta', 'aata', 'aatta', 'आटा', 'peeth', 'पीठ', 'flour', 'gehun', 'गेहूँ'] },
  rice:    { hi: 'चावल', mr: 'तांदूळ', en: 'rice', words: ['chawal', 'chaval', 'चावल', 'tandul', 'तांदूळ', 'तांदूळ', 'rice'] },
  dal:     { hi: 'दाल', mr: 'डाळ', en: 'dal', words: ['dal', 'daal', 'दाल', 'डाळ', 'dhal', 'lentils'] },
  oil:     { hi: 'तेल', mr: 'तेल', en: 'oil', words: ['tel', 'तेल', 'oil'] },
  sugar:   { hi: 'चीनी', mr: 'साखर', en: 'sugar', words: ['cheeni', 'chini', 'चीनी', 'shakkar', 'शक्कर', 'sakhar', 'साखर', 'sugar'] },
  milk:    { hi: 'दूध', mr: 'दूध', en: 'milk', words: ['doodh', 'dudh', 'दूध', 'milk'] },
  tea:     { hi: 'चाय पत्ती', mr: 'चहा', en: 'tea', words: ['chai', 'chay', 'चाय', 'patti', 'पत्ती', 'chaha', 'चहा', 'tea'] },
  soap:    { hi: 'साबुन', mr: 'साबण', en: 'soap', words: ['sabun', 'saabun', 'साबुन', 'saban', 'साबण', 'soap'] },
  salt:    { hi: 'नमक', mr: 'मीठ', en: 'salt', words: ['namak', 'नमक', 'meeth', 'मीठ', 'salt'] },
  eggs:    { hi: 'अंडे', mr: 'अंडी', en: 'eggs', words: ['anda', 'ande', 'अंडा', 'अंडे', 'andi', 'अंडी', 'egg', 'eggs'] },
  bread:   { hi: 'ब्रेड', mr: 'ब्रेड', en: 'bread', words: ['bread', 'ब्रेड', 'pav', 'पाव', 'double roti'] },
  biscuit: { hi: 'बिस्किट', mr: 'बिस्किट', en: 'biscuits', words: ['biscuit', 'biskut', 'बिस्किट', 'बिस्कुट', 'biscuits'] },
  noodles: { hi: 'नूडल्स', mr: 'नूडल्स', en: 'noodles', words: ['maggi', 'मैगी', 'मॅगी', 'noodles', 'नूडल्स'] },
  ghee:    { hi: 'घी', mr: 'तूप', en: 'ghee', words: ['ghee', 'ghi', 'घी', 'toop', 'tup', 'तूप'] },
  spices:  { hi: 'मसाला', mr: 'मसाला', en: 'spices', words: ['masala', 'मसाला', 'mirchi', 'मिर्च', 'haldi', 'हल्दी', 'spices'] },
  veg:     { hi: 'सब्ज़ी', mr: 'भाजी', en: 'vegetables', words: ['sabzi', 'sabji', 'सब्ज़ी', 'सब्जी', 'bhaji', 'भाजी', 'vegetables', 'vegetable'] },
  potato:  { hi: 'आलू', mr: 'बटाटा', en: 'potatoes', words: ['aloo', 'alu', 'आलू', 'batata', 'बटाटा', 'potato', 'potatoes'] },
  onion:   { hi: 'प्याज़', mr: 'कांदा', en: 'onions', words: ['pyaaz', 'pyaj', 'pyaz', 'प्याज', 'प्याज़', 'kanda', 'कांदा', 'onion', 'onions'] },
  tomato:  { hi: 'टमाटर', mr: 'टोमॅटो', en: 'tomatoes', words: ['tamatar', 'टमाटर', 'tomato', 'tomatoes', 'टोमॅटो'] },
  curd:    { hi: 'दही', mr: 'दही', en: 'curd', words: ['dahi', 'दही', 'curd'] },
  paneer:  { hi: 'पनीर', mr: 'पनीर', en: 'paneer', words: ['paneer', 'पनीर'] },
  ration:  { hi: 'महीने का राशन', mr: 'महिन्याचे रेशन', en: 'monthly ration', words: ['rashan', 'ration', 'राशन', 'रेशन', 'kirana'] }
};

export const CUSTOMERS = [
  { id: 'c1', name: 'मोहन जी', latin: 'Mohan ji', lang: 'hi' },
  { id: 'c2', name: 'सुनीता दीदी', latin: 'Sunita didi', lang: 'hi' },
  { id: 'c3', name: 'गणेश पाटील', latin: 'Ganesh Patil', lang: 'mr' },
  { id: 'c4', name: 'रमेश भैया', latin: 'Ramesh bhaiya', note: 'दूधवाले', noteLatin: 'milkman', lang: 'hi' },
  { id: 'c5', name: 'विकास', latin: 'Vikas', lang: 'hi' },
  { id: 'c6', name: 'आशा ताई', latin: 'Asha tai', lang: 'mr' },
  { id: 'c7', name: 'रमेश सोनी', latin: 'Ramesh Soni', lang: 'hi' },
  { id: 'c8', name: 'फ़ातिमा बी', latin: 'Fatima bi', lang: 'hi' }
];

const DAY = 86400000;

/** Build the demo ledger relative to `now`, so "12 days due" stays true on any date. */
export function seedState(now = Date.now()) {
  const at = (daysAgo, h, m) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  // Today's entries sit a little before "now" so they're never in the future.
  const todayAt = minsAgo => now - minsAgo * 60000;
  let n = 0;
  const e = (cid, type, amount, items, ts, via = 'voice') =>
    ({ id: 'e' + (++n), cid, type, amount, items, at: ts, via, transcript: '' });

  const entries = [
    e('c1', 'credit', 1500, ['ration'], at(28, 10, 15)),
    e('c1', 'credit', 1000, ['oil', 'sugar', 'dal'], at(14, 18, 30)),
    e('c1', 'payment', 350, [], todayAt(95), 'upi'),
    e('c2', 'credit', 1020, ['ration'], at(12, 18, 30)),
    e('c2', 'credit', 380, ['milk', 'bread', 'soap'], at(8, 9, 5)),
    e('c2', 'payment', 500, [], at(5, 19, 15), 'upi'),
    e('c3', 'credit', 860, ['rice', 'dal'], at(9, 11, 40)),
    e('c4', 'credit', 500, ['atta', 'oil'], at(6, 8, 20)),
    e('c4', 'credit', 300, ['sugar', 'tea'], todayAt(40)),
    e('c5', 'credit', 650, ['biscuit', 'noodles', 'eggs'], at(5, 20, 10)),
    e('c6', 'credit', 420, ['veg', 'onion'], at(3, 17, 45)),
    e('c7', 'credit', 700, ['ration'], at(16, 10, 0)),
    e('c7', 'payment', 700, [], at(9, 18, 0), 'upi'),
    e('c7', 'credit', 300, ['milk', 'bread'], at(2, 8, 50)),
    e('c8', 'credit', 180, ['eggs', 'bread'], at(4, 9, 30))
  ];

  return {
    version: 1,
    lang: null,
    voiceReplies: true,
    shop: { name: 'शर्मा किराना', latin: 'Sharma Kirana', upi: '' },
    customers: CUSTOMERS.map(c => ({ ...c, phone: '' })),
    entries,
    reminded: { c3: now - 2 * DAY, c8: now - 1 * DAY },
    seq: n
  };
}
