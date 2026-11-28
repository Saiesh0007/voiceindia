# Bolo Khata · बोलो खाता

**A voice-first credit ledger for India's small shops.** The shopkeeper says the entry the way they already talk, *"सुनीता दीदी का 240 उधार लिख दो, आटा और तेल"*. Bolo Khata reads it back, hears "हाँ", and saves it.

Theme: **Livelihoods and small business**

---

## The problem

India's kirana stores, vegetable vendors and chai stalls run on *udhaar* (informal credit). Most shops keep it in a paper notebook, or in the owner's memory. Entries get missed during a rush, smudged notes turn into "I already paid" arguments, and asking a neighbour for money face-to-face is awkward. Khata apps exist, but they expect a shopkeeper with one hand on the scale to stop, open a form, find a contact and type an amount.

Bolo Khata replaces the form with one spoken sentence.

## Run it

No API keys, no accounts, no build step.

```bash
docker compose up
```

Then open **http://localhost:8080** in **Chrome or Edge** and allow the microphone.

Without Docker, any static server works: `cd app && python -m http.server 8080`.

| Want to… | Do this |
|---|---|
| Start fresh with demo data | open `http://localhost:8080/?reset` |
| Skip the language screen | add `?lang=hi`, `?lang=mr` or `?lang=en` |
| Talk on a laptop | hold the **Space** bar, or hold the mic button |
| Try it without a mic | tap **लिखकर / Type** and use the example sentences |

> **Browser support.** Voice uses the browser's built-in Web Speech API: Chrome, Edge and Safari support it, Firefox doesn't. In Chrome, speech recognition is done by the browser vendor's speech service, so it needs internet. **The ledger itself works offline**, and typing or hand entry works in every browser.

## The core flow (what to try)

1. **Hold the mic** and say: *"सुनीता दीदी का 240 उधार लिख दो, आटा और तेल"*
2. The words appear live, then chips show what was understood: **सुनीता दीदी · ₹240 · उधार**
3. A card reads it back aloud: *"सुनीता दीदी, ₹240 उधार, आटा और तेल। सही है?"* It also shows the balance change, **₹900 → ₹1,140**
4. Say **"हाँ"**. It saves, chimes and says *"लिख दिया। सुनीता दीदी का कुल बाकी ₹1,140।"* An **Undo** button stays on screen for 7 seconds

Other things you can say:

| Say | What happens |
|---|---|
| रमेश ने 500 जमा किए | Two customers are called Ramesh, so it asks **"कौन से रमेश?"** Answer "एक", "दो" or "दूधवाले" |
| विकास का उधार लिख दो | No amount was heard, so it asks only **"कितने रुपये?"** |
| *(during read-back)* नहीं, 350 | Corrects the amount and reads it back again |
| मोहन जी का 24000 उधार | A large or unusual amount gets a second "पक्का?" check |
| सुनीता का कितना बाकी है? | Opens her ledger and says the balance and how many days it's been due |
| आज का हिसाब | Today's credit, collections and total due |
| सबको रिमाइंडर भेज दो | Reminder list. Each customer gets a WhatsApp message in their language, with a UPI payment link |
| गलत हो गया | Removes the last entry after a spoken confirmation |
| Marathi: आशा ताईंच्या नावावर 300 उधार लिहा | Works the same in Marathi |
| English/Hinglish: Ramesh Soni paid 300 | Works the same in English |

## How it handles real shops

| Challenge | What Bolo Khata does |
|---|---|
| **Noise** (traffic, customers, TV) | Push-to-talk, so it only listens when asked, and a live transcript shows what it heard |
| **Mixed languages** ("Sunita ko two forty likho") | Every word is reduced to a phonetic key that's the same across scripts and spellings: *सुनीता*, *Sunita* and *Suneeta* all become `sunita` |
| **Spoken numbers** | Digits, Hindi number words 0–99 (*चालीस*, *पच्चीस*), *सौ/हज़ार/लाख*, *ढाई, डेढ़, साढ़े, पौने, सवा*, Marathi *दोनशे, पाचशे, दीड*, and English ("two forty") |
| **"लिख दो"** isn't the number 2 | Ambiguous words like *do* count as numbers only next to another number ("do sau") |
| **Quantities** ("दो किलो चावल 120 रुपये") | A number followed by a unit is a quantity, not the amount |
| **Who paid whom** | "विकास **ने** 300 दिए" is a payment and "विकास **को** 300 का सामान दिया" is credit |
| **Misheard input** | Uses the recogniser's top 4 guesses and picks the most complete parse. It never saves silently: every entry is read back. A missing piece gets one short follow-up question, not "say it all again" |
| **Two people, same name** | Asks which one, with numbers to answer by voice |
| **Big misheard amounts** | Above ₹5,000, or 10× the customer's usual amount, it confirms twice |
| **Still not understood** | After two misses it offers typing or hand entry. The shopkeeper is never stuck |
| **Disputes later** | Every entry keeps what was said, the time and how it was entered |

## How it works

```
mic ──► Web Speech API (hi-IN / mr-IN / en-IN, top 4 guesses)
         │
         ▼
   translit.js   Devanagari → Latin, then a phonetic key (script- and spelling-proof)
         │
         ▼
   parser.js     numbers · intent · customer (fuzzy + phonetic) · items · confidence
         │
         ▼
   app.js        missing piece? ask for just that one · read back · listen for "हाँ"
         │
         ▼
   store.js      ledger on the phone (localStorage) ──► WhatsApp + UPI reminder links
```

Everything runs in the browser. There is **no backend and no AI API**, so it costs nothing to run, works with the ledger offline, and the shop's credit data never leaves the phone unless the shopkeeper sends a reminder.

## What it depends on

- **Browser speech recognition** (Chrome, Edge, Safari) and **speech synthesis** for replies. Hindi and English voices are widely available. Marathi replies fall back to a Hindi voice where there's no Marathi voice.
- **WhatsApp** (via `wa.me` links) and any **UPI** app (via `upi://pay` links) for reminders and collection.
- Nothing else: no keys, no server, no database.

## Tests

```bash
node --test tests/parser.test.mjs
```

There are 21 tests covering Hindi, Marathi, Hinglish and English sentences: number words, two customers with the same name, quantities vs amounts, payment vs credit, yes/no replies and the demo data. CI also builds the Docker image and checks that it serves the app.

## Project layout

```
app/                 the whole app (static files)
  index.html  styles.css  sw.js  manifest.webmanifest
  js/app.js          screens and the voice flow
  js/parser.js       understanding a sentence
  js/translit.js     Devanagari ↔ Latin and phonetic keys
  js/i18n.js         Hindi, Marathi and English text and spoken replies
  js/store.js        the on-device ledger
  js/voice.js        speech recognition, speech synthesis, chime
  js/data.js         demo shop and item names
tests/               parser tests (node:test, no dependencies)
docs/round1/         Round 1 idea, prompt and impact write-ups
Dockerfile, docker-compose.yml, nginx.conf
```

## Limits and what's next

- **Languages:** Hindi, Marathi and English/Hinglish today. Tamil and Bengali are next: they need their own number words and keyword lists, and the script-to-key layer is already built to take them.
- **Speech recognition** relies on the browser's engine. An on-device Indic model (for example, AI4Bharat IndicConformer) would make voice work offline in villages with weak signal.
- **Data** lives on one phone. A backup to the shopkeeper's own Google Drive, or a sync for a second family member, is the next step.
- **Phone numbers** are optional in this prototype, so WhatsApp opens its contact picker.

---

Team Spectrum · Round 2 build
