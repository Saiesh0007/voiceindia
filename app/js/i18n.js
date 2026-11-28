// UI text and spoken replies for Hindi, Marathi and English (Hinglish speakers
// usually pick English or Hindi). Replies always repeat name, amount and type
// so a misheard entry is caught before it's saved.

import { ITEMS } from './data.js';

export const LANGS = {
  hi: { label: 'हिंदी', speech: 'hi-IN', voice: ['hi-IN'], hint: 'हिंदी और हिंग्लिश' },
  mr: { label: 'मराठी', speech: 'mr-IN', voice: ['mr-IN', 'hi-IN'], hint: 'मराठी' },
  en: { label: 'English', speech: 'en-IN', voice: ['en-IN', 'en-GB', 'en-US'], hint: 'English & Hinglish' }
};

export const money = n => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n));

const joinList = (arr, and) => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + and + arr[arr.length - 1];

const MONTHS = {
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नवं', 'दिसं'],
  mr: ['जाने', 'फेब्रु', 'मार्च', 'एप्रि', 'मे', 'जून', 'जुलै', 'ऑग', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

const T = {
  hi: {
    appName: 'बोलो खाता', tagline: 'बोलिए, खाते में लिख जाएगा',
    chooseLang: 'अपनी भाषा चुनें', chooseLangSub: 'बाद में सेटिंग में बदल सकते हैं', soon: 'जल्द आ रहा है',
    todayCredit: 'आज उधार', todayPaid: 'आज जमा', entriesToday: n => `${n} एंट्री`,
    dues: 'किसका कितना बाकी', totalLine: (amt, n) => `कुल ${amt} · ${n} ग्राहक`,
    holdToTalk: 'दबाकर बोलें', listening: 'सुन रहा हूँ…', understood: 'समझ गया', thinking: 'समझ रहा हूँ…',
    releaseToSend: 'छोड़ें तो लिख दूँ', tapToStop: 'बोलकर रुकें, या दबाएँ',
    sayLike: 'ऐसे बोलिए',
    examples: ['सुनीता दीदी का 240 उधार लिख दो, आटा और तेल', 'रमेश ने 500 जमा किए', 'सुनीता का कितना बाकी है?', 'आज का हिसाब', 'सबको रिमाइंडर भेज दो', 'गलत हो गया'],
    type: 'लिखकर', typeTitle: 'बोल नहीं सकते? लिखिए', typePlaceholder: 'जैसे: सुनीता दीदी का 240 उधार', go: 'आगे',
    keypad: 'हाथ से', credit: 'उधार', payment: 'जमा',
    yes: 'हाँ, लिख दो', no: 'नहीं', sayYesNo: 'बोलिए “हाँ” या “नहीं”', listeningShort: 'सुन रहा हूँ',
    confirmCredit: 'उधार लिखना है?', confirmPayment: 'जमा लिखना है?',
    newCustomer: 'नया ग्राहक', youSaid: 'आपने कहा', balance: 'बाकी', after: 'के बाद',
    since: n => (n <= 0 ? 'आज से बाकी' : `${n} दिन से बाकी`), noDue: 'कोई बाकी नहीं', advance: 'एडवांस',
    askAmount: 'कितने रुपये?', askName: 'किसके नाम पर?', whichOne: n => `कौन से ${n}?`,
    whichHint: 'नंबर बोलें या दबाएँ', newNamed: n => `नया ग्राहक “${n}”`, orTap: 'या नीचे से चुनें',
    switchTo: l => `${l} करें`, changeAmount: 'रकम बदलें',
    big: amt => `${amt} बड़ी रकम है। पक्का लिखूँ?`, bigTitle: 'बड़ी रकम', sureYes: 'हाँ, पक्का',
    reminders: 'याद दिलाएँ', remindersTitle: 'पैसे याद दिलाएँ', remindHint: 'जिन्हें भेजना है, उन पर टिक करें',
    send: n => `WhatsApp पर भेजें (${n})`, next: (name, i, n) => `अगला: ${name} (${i}/${n})`, allSent: 'सबको भेज दिया',
    remindedToday: 'आज याद दिलाया', remindedAgo: n => (n === 1 ? 'कल याद दिलाया' : n === 2 ? 'परसों याद दिलाया' : `${n} दिन पहले याद दिलाया`),
    upiId: 'आपकी UPI ID', upiPlaceholder: 'जैसे: sharmakirana@okbank', upiMissing: 'UPI ID डालें तो मैसेज में पेमेंट लिंक भी जाएगा',
    remindSingle: 'WhatsApp पर याद दिलाएँ', selected: (n, amt) => `${n} चुने · ${amt}`,
    history: 'हिसाब', tapToEdit: 'दबाएँ तो सुधारें', via: { voice: 'आवाज़ से', type: 'लिखकर', hand: 'हाथ से', upi: 'UPI' },
    today: 'आज', yesterday: 'कल',
    settings: 'सेटिंग', shopName: 'दुकान का नाम', voiceReplies: 'आवाज़ में जवाब', language: 'भाषा',
    resetDemo: 'डेमो डेटा फिर से भरें', resetConfirm: 'सारा हिसाब मिटाकर डेमो डेटा भरें?',
    save: 'सेव करें', del: 'एंट्री हटाएँ', edit: 'एंट्री सुधारें', amount: 'रकम', customer: 'ग्राहक', search: 'नाम खोजें',
    close: 'बंद करें', back: 'वापस', undo: 'वापस लें', cancel: 'रद्द करें', manualTitle: 'हाथ से लिखें', pickCustomer: 'ग्राहक चुनें',
    addNew: 'नया ग्राहक जोड़ें', newNamePlaceholder: 'नाम लिखें', summaryTitle: 'आज का हिसाब', dueTotal: 'कुल बाकी',
    noSpeech: 'इस ब्राउज़र में आवाज़ नहीं चलती। Chrome या Edge में खोलें, या लिखकर बताइए।',
    micDenied: 'माइक की अनुमति नहीं मिली। ब्राउज़र में माइक चालू करें, या लिखकर बताइए।',
    netErr: 'आवाज़ पहचानने के लिए इंटरनेट चाहिए। हिसाब ऑफ़लाइन भी चलता है, अभी लिखकर बताइए।',
    heardNothing: 'कुछ सुनाई नहीं दिया। फिर से बोलिए।',
    privacy: 'हिसाब सिर्फ़ इसी फ़ोन में रहता है।',
    item: id => ITEMS[id] ? ITEMS[id].hi : id, and: ' और ',

    // spoken / shown replies
    readback: (e) => e.type === 'credit'
      ? `${e.isNew ? 'नया ग्राहक। ' : ''}${e.name}, ${money(e.amount)} उधार${e.items.length ? ', ' + joinList(e.items, ' और ') : ''}। सही है?`
      : `${e.isNew ? 'नया ग्राहक। ' : ''}${e.name} ने ${money(e.amount)} जमा किए। सही है?`,
    saved: (e, bal) => e.type === 'credit'
      ? `लिख दिया। ${e.name} का कुल बाकी ${money(bal)}।`
      : bal > 0 ? `हो गया। अब ${e.name} का बाकी ${money(bal)}।` : bal === 0 ? `हो गया। ${e.name} का हिसाब साफ़।` : `हो गया। ${e.name} का ${money(bal)} एडवांस है।`,
    cancelled: 'ठीक है, नहीं लिखा।', undone: d => `हटा दिया: ${d}`,
    notUnderstood: 'समझ नहीं आया। फिर से बोलिए, जैसे “सुनीता दीदी का 240 उधार”।',
    notUnderstood2: 'माफ़ कीजिए, फिर भी समझ नहीं आया। लिखकर बताइए या हाथ से चुनिए।',
    balanceSay: (name, bal, days) => bal > 0 ? `${name} का ${money(bal)} बाकी है, ${days <= 0 ? 'आज से' : days + ' दिन से'}।` : bal === 0 ? `${name} का कोई बाकी नहीं।` : `${name} का ${money(bal)} एडवांस है।`,
    summarySay: (cr, pd, total, n) => `आज ${money(cr)} उधार दिया, ${money(pd)} जमा हुआ। कुल ${money(total)} बाकी है, ${n} लोगों पर।`,
    remindSay: (n, total) => n ? `${n} लोगों का कुल ${money(total)} बाकी है। हरा बटन दबाकर WhatsApp पर भेजिए।` : 'किसी का कुछ बाकी नहीं।',
    undoAsk: d => `पिछली एंट्री हटाऊँ? ${d}`, nothingToUndo: 'हटाने के लिए कोई एंट्री नहीं है।',
    notFound: n => `${n} नाम का कोई ग्राहक नहीं मिला।`,
    entryDesc: (name, e) => `${name}, ${money(e.amount)} ${e.type === 'credit' ? 'उधार' : 'जमा'}`,
    reminderMsg: (name, amt, shop, upi, link) =>
      `नमस्ते ${name}, ${shop} में आपका ${money(amt)} बाकी है।` + (upi ? `\nUPI से भेज सकते हैं: ${upi}\n${link}` : '') + `\nधन्यवाद!`
  },

  mr: {
    appName: 'बोलो खाता', tagline: 'बोला, खात्यात लिहिलं जाईल',
    chooseLang: 'तुमची भाषा निवडा', chooseLangSub: 'नंतर सेटिंगमध्ये बदलता येईल', soon: 'लवकरच',
    todayCredit: 'आज उधार', todayPaid: 'आज जमा', entriesToday: n => `${n} नोंदी`,
    dues: 'कोणाचे किती बाकी', totalLine: (amt, n) => `एकूण ${amt} · ${n} ग्राहक`,
    holdToTalk: 'दाबून बोला', listening: 'ऐकतोय…', understood: 'समजलं', thinking: 'समजून घेतोय…',
    releaseToSend: 'सोडा, लिहितो', tapToStop: 'बोलून थांबा, किंवा दाबा',
    sayLike: 'असं बोला',
    examples: ['आशा ताईंच्या नावावर 300 उधार लिहा', 'गणेश पाटील यांनी 500 जमा केले', 'सुनीता ताईंचे किती बाकी आहे?', 'आजचा हिशोब', 'सगळ्यांना आठवण पाठवा', 'चूक झाली'],
    type: 'लिहून', typeTitle: 'बोलता येत नाही? लिहा', typePlaceholder: 'उदा: आशा ताई 300 उधार', go: 'पुढे',
    keypad: 'हाताने', credit: 'उधार', payment: 'जमा',
    yes: 'हो, लिहा', no: 'नाही', sayYesNo: 'बोला “हो” किंवा “नाही”', listeningShort: 'ऐकतोय',
    confirmCredit: 'उधार लिहायचं?', confirmPayment: 'जमा लिहायचं?',
    newCustomer: 'नवीन ग्राहक', youSaid: 'तुम्ही म्हणालात', balance: 'बाकी', after: 'नंतर',
    since: n => (n <= 0 ? 'आजपासून बाकी' : `${n} दिवसांपासून बाकी`), noDue: 'काही बाकी नाही', advance: 'ॲडव्हान्स',
    askAmount: 'किती रुपये?', askName: 'कोणाच्या नावावर?', whichOne: n => `कोणते ${n}?`,
    whichHint: 'नंबर बोला किंवा दाबा', newNamed: n => `नवीन ग्राहक “${n}”`, orTap: 'किंवा खालून निवडा',
    switchTo: l => `${l} करा`, changeAmount: 'रक्कम बदला',
    big: amt => `${amt} मोठी रक्कम आहे. नक्की लिहू?`, bigTitle: 'मोठी रक्कम', sureYes: 'हो, नक्की',
    reminders: 'आठवण', remindersTitle: 'पैशांची आठवण', remindHint: 'ज्यांना पाठवायचं, त्यांना टिक करा',
    send: n => `WhatsApp वर पाठवा (${n})`, next: (name, i, n) => `पुढचे: ${name} (${i}/${n})`, allSent: 'सगळ्यांना पाठवलं',
    remindedToday: 'आज आठवण केली', remindedAgo: n => (n === 1 ? 'काल आठवण केली' : `${n} दिवसांपूर्वी आठवण केली`),
    upiId: 'तुमचा UPI ID', upiPlaceholder: 'उदा: sharmakirana@okbank', upiMissing: 'UPI ID टाकला तर मेसेजमध्ये पेमेंट लिंक जाईल',
    remindSingle: 'WhatsApp वर आठवण करा', selected: (n, amt) => `${n} निवडले · ${amt}`,
    history: 'हिशोब', tapToEdit: 'दाबून दुरुस्त करा', via: { voice: 'आवाजाने', type: 'लिहून', hand: 'हाताने', upi: 'UPI' },
    today: 'आज', yesterday: 'काल',
    settings: 'सेटिंग', shopName: 'दुकानाचे नाव', voiceReplies: 'आवाजात उत्तर', language: 'भाषा',
    resetDemo: 'डेमो डेटा पुन्हा भरा', resetConfirm: 'सगळा हिशोब पुसून डेमो डेटा भरायचा?',
    save: 'सेव्ह करा', del: 'नोंद काढा', edit: 'नोंद दुरुस्त करा', amount: 'रक्कम', customer: 'ग्राहक', search: 'नाव शोधा',
    close: 'बंद करा', back: 'मागे', undo: 'परत घ्या', cancel: 'रद्द करा', manualTitle: 'हाताने लिहा', pickCustomer: 'ग्राहक निवडा',
    addNew: 'नवीन ग्राहक जोडा', newNamePlaceholder: 'नाव लिहा', summaryTitle: 'आजचा हिशोब', dueTotal: 'एकूण बाकी',
    noSpeech: 'या ब्राउझरमध्ये आवाज चालत नाही. Chrome किंवा Edge मध्ये उघडा, किंवा लिहून सांगा.',
    micDenied: 'माइकची परवानगी मिळाली नाही. ब्राउझरमध्ये माइक चालू करा, किंवा लिहून सांगा.',
    netErr: 'आवाज ओळखायला इंटरनेट लागतं. हिशोब ऑफलाइनही चालतो, आत्ता लिहून सांगा.',
    heardNothing: 'काही ऐकू आलं नाही. पुन्हा बोला.',
    privacy: 'हिशोब फक्त याच फोनमध्ये राहतो.',
    item: id => ITEMS[id] ? ITEMS[id].mr : id, and: ' आणि ',

    readback: (e) => e.type === 'credit'
      ? `${e.isNew ? 'नवीन ग्राहक. ' : ''}${e.name}, ${money(e.amount)} उधार${e.items.length ? ', ' + joinList(e.items, ' आणि ') : ''}. बरोबर आहे?`
      : `${e.isNew ? 'नवीन ग्राहक. ' : ''}${e.name} यांनी ${money(e.amount)} जमा केले. बरोबर आहे?`,
    saved: (e, bal) => e.type === 'credit'
      ? `लिहिलं. ${e.name} यांचे एकूण बाकी ${money(bal)}.`
      : bal > 0 ? `झालं. आता ${e.name} यांचे बाकी ${money(bal)}.` : bal === 0 ? `झालं. ${e.name} यांचा हिशोब पूर्ण.` : `झालं. ${e.name} यांचे ${money(bal)} ॲडव्हान्स आहेत.`,
    cancelled: 'ठीक आहे, लिहिलं नाही.', undone: d => `काढलं: ${d}`,
    notUnderstood: 'समजलं नाही. पुन्हा बोला, जसं “आशा ताई 300 उधार”.',
    notUnderstood2: 'माफ करा, तरी समजलं नाही. लिहून सांगा किंवा हाताने निवडा.',
    balanceSay: (name, bal, days) => bal > 0 ? `${name} यांचे ${money(bal)} बाकी आहेत, ${days <= 0 ? 'आजपासून' : days + ' दिवसांपासून'}.` : bal === 0 ? `${name} यांचे काही बाकी नाही.` : `${name} यांचे ${money(bal)} ॲडव्हान्स आहेत.`,
    summarySay: (cr, pd, total, n) => `आज ${money(cr)} उधार दिलं, ${money(pd)} जमा झाले. एकूण ${money(total)} बाकी, ${n} लोकांकडे.`,
    remindSay: (n, total) => n ? `${n} लोकांचे एकूण ${money(total)} बाकी आहेत. हिरवं बटण दाबून WhatsApp वर पाठवा.` : 'कोणाचेच काही बाकी नाही.',
    undoAsk: d => `मागची नोंद काढू? ${d}`, nothingToUndo: 'काढायला कोणतीही नोंद नाही.',
    notFound: n => `${n} नावाचा कोणी ग्राहक सापडला नाही.`,
    entryDesc: (name, e) => `${name}, ${money(e.amount)} ${e.type === 'credit' ? 'उधार' : 'जमा'}`,
    reminderMsg: (name, amt, shop, upi, link) =>
      `नमस्कार ${name}, ${shop} येथे तुमचे ${money(amt)} बाकी आहेत.` + (upi ? `\nUPI ने पाठवू शकता: ${upi}\n${link}` : '') + `\nधन्यवाद!`
  },

  en: {
    appName: 'Bolo Khata', tagline: 'Say it, and it’s in the khata',
    chooseLang: 'Choose your language', chooseLangSub: 'You can change this later in settings', soon: 'Coming soon',
    todayCredit: 'Credit today', todayPaid: 'Paid today', entriesToday: n => `${n} ${n === 1 ? 'entry' : 'entries'}`,
    dues: 'Who owes what', totalLine: (amt, n) => `${amt} total · ${n} customers`,
    holdToTalk: 'Hold to talk', listening: 'Listening…', understood: 'Got it', thinking: 'Working it out…',
    releaseToSend: 'Let go to save', tapToStop: 'Stop talking, or tap',
    sayLike: 'Try saying',
    examples: ['Sunita didi ka 240 udhaar likh do, atta aur tel', 'Ramesh paid 500', 'How much does Sunita owe?', 'Today’s summary', 'Send reminders to everyone', 'That was wrong'],
    type: 'Type', typeTitle: 'Can’t speak right now? Type it', typePlaceholder: 'e.g. Sunita didi 240 credit', go: 'Go',
    keypad: 'By hand', credit: 'Credit', payment: 'Paid',
    yes: 'Yes, save it', no: 'No', sayYesNo: 'Say “yes” or “no”', listeningShort: 'Listening',
    confirmCredit: 'Save this credit?', confirmPayment: 'Save this payment?',
    newCustomer: 'New customer', youSaid: 'You said', balance: 'Due', after: 'after',
    since: n => (n <= 0 ? 'due since today' : `due ${n} ${n === 1 ? 'day' : 'days'}`), noDue: 'Nothing due', advance: 'advance',
    askAmount: 'How much?', askName: 'For whom?', whichOne: n => `Which ${n}?`,
    whichHint: 'Say the number, or tap', newNamed: n => `New customer “${n}”`, orTap: 'or pick below',
    switchTo: l => `Make it ${l.toLowerCase()}`, changeAmount: 'Change amount',
    big: amt => `${amt} is a large amount. Are you sure?`, bigTitle: 'Large amount', sureYes: 'Yes, I’m sure',
    reminders: 'Remind', remindersTitle: 'Payment reminders', remindHint: 'Tick the people you want to remind',
    send: n => `Send on WhatsApp (${n})`, next: (name, i, n) => `Next: ${name} (${i}/${n})`, allSent: 'All sent',
    remindedToday: 'Reminded today', remindedAgo: n => (n === 1 ? 'Reminded yesterday' : `Reminded ${n} days ago`),
    upiId: 'Your UPI ID', upiPlaceholder: 'e.g. sharmakirana@okbank', upiMissing: 'Add a UPI ID to include a payment link',
    remindSingle: 'Remind on WhatsApp', selected: (n, amt) => `${n} selected · ${amt}`,
    history: 'History', tapToEdit: 'Tap to fix', via: { voice: 'by voice', type: 'typed', hand: 'by hand', upi: 'UPI' },
    today: 'Today', yesterday: 'Yesterday',
    settings: 'Settings', shopName: 'Shop name', voiceReplies: 'Spoken replies', language: 'Language',
    resetDemo: 'Reload demo data', resetConfirm: 'Erase everything and reload the demo data?',
    save: 'Save', del: 'Delete entry', edit: 'Fix entry', amount: 'Amount', customer: 'Customer', search: 'Search names',
    close: 'Close', back: 'Back', undo: 'Undo', cancel: 'Cancel', manualTitle: 'Add by hand', pickCustomer: 'Pick a customer',
    addNew: 'Add new customer', newNamePlaceholder: 'Type a name', summaryTitle: 'Today’s summary', dueTotal: 'Total due',
    noSpeech: 'Voice doesn’t work in this browser. Open it in Chrome or Edge, or type instead.',
    micDenied: 'Microphone permission was blocked. Turn the mic on in your browser, or type instead.',
    netErr: 'Speech recognition needs internet. The ledger works offline, so type for now.',
    heardNothing: 'I didn’t hear anything. Please try again.',
    privacy: 'Your ledger stays on this phone.',
    item: id => ITEMS[id] ? ITEMS[id].en : id, and: ' and ',

    readback: (e) => e.type === 'credit'
      ? `${e.isNew ? 'New customer. ' : ''}${e.name}, ${money(e.amount)} on credit${e.items.length ? ': ' + joinList(e.items, ' and ') : ''}. Is that right?`
      : `${e.isNew ? 'New customer. ' : ''}${e.name} paid ${money(e.amount)}. Is that right?`,
    saved: (e, bal) => e.type === 'credit'
      ? `Saved. ${e.name} now owes ${money(bal)}.`
      : bal > 0 ? `Done. ${e.name} now owes ${money(bal)}.` : bal === 0 ? `Done. ${e.name} is all settled.` : `Done. ${e.name} has ${money(bal)} in advance.`,
    cancelled: 'Okay, not saved.', undone: d => `Removed: ${d}`,
    notUnderstood: 'Sorry, I didn’t get that. Try “Sunita didi 240 credit”.',
    notUnderstood2: 'Still didn’t get it. Type it, or add it by hand.',
    balanceSay: (name, bal, days) => bal > 0 ? `${name} owes ${money(bal)}, ${days <= 0 ? 'since today' : 'for ' + days + ' days'}.` : bal === 0 ? `${name} owes nothing.` : `${name} has ${money(bal)} in advance.`,
    summarySay: (cr, pd, total, n) => `Today you gave ${money(cr)} on credit and collected ${money(pd)}. ${money(total)} is due from ${n} people.`,
    remindSay: (n, total) => n ? `${n} people owe ${money(total)} in total. Press the green button to send on WhatsApp.` : 'Nobody owes anything.',
    undoAsk: d => `Remove the last entry? ${d}`, nothingToUndo: 'There’s no entry to remove.',
    notFound: n => `I couldn’t find a customer called ${n}.`,
    entryDesc: (name, e) => `${name}, ${money(e.amount)} ${e.type === 'credit' ? 'credit' : 'paid'}`,
    reminderMsg: (name, amt, shop, upi, link) =>
      `Hello ${name}, you have ${money(amt)} due at ${shop}.` + (upi ? `\nYou can pay by UPI: ${upi}\n${link}` : '') + `\nThank you!`
  }
};

export function t(lang) { return T[lang] || T.hi; }

export function dateLabel(ts, lang, now = Date.now()) {
  const d = new Date(ts), n = new Date(now);
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(n) - day(d)) / 86400000);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?(am|pm)/i, (m, p) => ' ' + p.toLowerCase());
  const L = t(lang);
  if (diff === 0) return `${L.today}, ${time}`;
  if (diff === 1) return `${L.yesterday}, ${time}`;
  return `${d.getDate()} ${MONTHS[lang] ? MONTHS[lang][d.getMonth()] : MONTHS.en[d.getMonth()]}, ${time}`;
}

/** Text for the speech synthesiser: "₹1,140" read as "1140 रुपये" so every voice says it right. */
export function speakable(text, lang) {
  const word = lang === 'en' ? 'rupees' : 'रुपये';
  return String(text).replace(/₹\s?([\d,]+(\.\d+)?)/g, (m, n) => `${n.replace(/,/g, '')} ${word}`).replace(/“|”/g, '');
}
