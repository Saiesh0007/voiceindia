Your users and their languages:
Build "Bolo Khata", a mobile-first web app (PWA) that lets small Indian shopkeepers (kirana owners, vegetable vendors, chai stall owners) record customer credit (udhaar) and payments by speaking. Users are busy, often have one hand free, may have limited literacy, and rarely type. They speak Hindi, Hinglish (Hindi-English mixed), Marathi, Tamil, Bengali and English, often switching mid-sentence. On first launch the shopkeeper picks a language from big buttons written in its own script (हिंदी, मराठी, தமிழ், বাংলা, English). Keep text minimal, buttons large (64px+), and prefer icons and numbers.

The voice flow, step by step:
1. Home screen: a large mic button at the bottom, today's udhaar and collections at the top, and customers with balances below. Hold the mic to talk.
2. The shopkeeper speaks naturally, for example: "Sunita didi ka 240 udhaar likh do, atta aur tel", "Ramesh bhaiya ne 500 jama kiye", "Sunita ka kitna baaki hai?", "Aaj kitna udhaar diya?", "Sabko reminder bhej do".
3. Convert speech to text with an Indic-capable speech-to-text service (fallback: browser Web Speech API with hi-IN, mr-IN, ta-IN, bn-IN or en-IN).
4. Send the transcript to an LLM with a strict JSON schema: { intent: "add_credit" | "add_payment" | "check_balance" | "daily_summary" | "send_reminders" | "undo" | "unknown", customer_name, amount (number, in rupees), items (array), confidence (0–1) }. Convert spoken numbers in any language ("dhai sau", "do sau chalis", "two forty") to digits.
5. Match customer_name to the existing customer list with fuzzy and phonetic matching ("Sunita didi", "Sunita ji" and "Suneeta" are the same person). If there's no match, treat it as a new customer.
6. Read the entry back aloud using text-to-speech in the chosen language and show a confirmation card. The shopkeeper says "haan" / "ho" / "aamaam" / "yes" or taps a green tick to save, and says "nahi" or taps a red cross to cancel. If there's no response for 6 seconds, keep the card on screen and don't save.
7. On save, update the ledger, play a short success chime, and show the new balance.
8. For "send_reminders", list every customer with a due balance and their amount, and confirm once. Then, for each customer, open a WhatsApp share link (wa.me) with a polite pre-filled message in the shopkeeper's language containing the due amount and a UPI payment link (upi://pay?pa=<shop UPI ID>&am=<amount>&tn=Bolo Khata).
9. "Undo" or "galat ho gaya" reverses the last entry after a spoken confirmation.
Store data locally (IndexedDB) so the ledger works offline.

What the product says or shows back:
Responses are short, warm and spoken in the shopkeeper's language, always repeating name, amount and type so mistakes are caught:
- Credit: "Sunita didi, ₹240 udhaar, atta aur tel. Sahi hai?" After saving: "Likh diya. Sunita didi ka kul baaki ₹1,140."
- Payment: "Ramesh bhaiya ne ₹500 jama kiye. Sahi hai?" After saving: "Ho gaya. Ab baaki ₹300."
- Balance: "Sunita didi ka ₹1,140 baaki hai, 12 din se."
- Daily summary: "Aaj ₹2,350 udhaar diya, ₹1,800 wapas aaya."
- Reminder message to customer: "Namaste Sunita ji, Sharma Kirana mein aapka ₹1,140 baaki hai. Aap is link se UPI se de sakte hain: <link>. Dhanyavaad!"
On screen, show a card with the customer's name, a large amount (red for credit, green for payment) and item icons. Each customer's page shows a dated history.

Noise, accents, mixed languages and misheard input:
- Shops are noisy (traffic, customers, TV). Use push-to-talk, apply noise suppression, and show a live waveform so the user knows they're being heard.
- Accept code-mixed speech in any order ("240 ka udhaar Sunita", "Sunita ko two forty likho"). The LLM prompt must include examples of Hinglish and regional mixes and regional number words.
- Never save silently. If the confidence score is below 0.7, or the name or amount is missing, ask one short follow-up for just the missing part: "Kitne rupaye?" or "Kiske naam pe?". Don't make the user repeat the whole sentence.
- If two customers match ("Ramesh" and "Ramesh bhaiya doodhwale"), ask: "Kaunse Ramesh? Ek bolo ya do bolo", and show both with numbers.
- Amounts above ₹5,000, or ten times the customer's usual amount, get a second confirmation ("₹24,000? Sahi hai?") to catch misheard numbers.
- If speech isn't understood twice, show a numeric keypad and the customer list as a fallback. Never get stuck.
- Save the transcript with each entry for disputes, and let the shopkeeper tap any entry to edit it.
Demo data: preload 8 customers with Hindi and Marathi names and two weeks of realistic entries.
