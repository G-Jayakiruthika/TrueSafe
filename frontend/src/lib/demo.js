/**
 * Front-end-only demo backend.
 *
 * The GitHub Pages copy of TrueSafe has no server: there is nothing to hold a
 * session, call Gemini or store a scan. This module stands in for all of it so the
 * whole app can be walked through from a static host — the same purpose the
 * backend's own `heuristic()` serves when no Gemini key is configured, and it
 * mirrors that function's wording so the demo and the real thing agree.
 *
 * It is wired in only when the bundle is built with VITE_DEMO=1. A production
 * build never reaches this file, so a real deployment can never fall back to a
 * fake session if its API happens to be unreachable.
 */

const KEY = 'truesafe:demo';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};
const write = (d) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch { /* private browsing: the demo still runs, it just forgets */ }
};

/** Same redaction the server applies, so the demo shows real redacted output. */
export function redactPII(s) {
  return String(s)
    .replace(/\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR]')
    .replace(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, '[PHONE]')
    .replace(/\b\d{9,18}\b/g, '[ACCOUNT]')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
    .replace(/\b[\w.-]+@[a-z]{2,}\b/gi, '[UPI]')
    .replace(/\b\d{4,6}\b(?=.*\botp\b)|(?<=\botp\b\D{0,12})\d{4,8}/gi, '[OTP]');
}

/** The eight scam families, each with the words that give it away. */
const TYPES = [
  { type: 'Digital arrest', re: /\b(cbi|police|arrest|warrant|narcotics|customs officer|video call|cyber cell|court)\b/i, tactic: 'Authority + fear' },
  { type: 'KYC/OTP', re: /\b(kyc|otp|aadhaar|pan card|re-?kyc|account.{0,12}block|verify.{0,12}(account|card)|net ?banking)\b/i, tactic: 'Urgency + authority' },
  { type: 'Fake investment', re: /\b(invest|trading|stock tips|guaranteed|profit|double|crypto|ipo|vip group|returns)\b/i, tactic: 'Greed + false scarcity' },
  { type: 'Courier parcel', re: /\b(courier|parcel|fedex|dtdc|customs duty|package|shipment.{0,12}hold)\b/i, tactic: 'Fear + fake authority' },
  { type: 'Task job', re: /\b(task|work from home|part.?time|like.{0,10}video|rating job|telegram job|prepaid task)\b/i, tactic: 'Small win then a deposit' },
  { type: 'Lottery/bill', re: /\b(lottery|lucky draw|prize|winner|kbc|processing fee|electricity.{0,16}disconnect|bill.{0,12}due)\b/i, tactic: 'Greed or shock' },
  { type: 'Voice clone', re: /\b(new number|phone (broke|lost)|this is (amma|appa|mummy|papa)|urgent.{0,16}(money|transfer)|emergency)\b/i, tactic: 'Impersonating family' },
  { type: 'Loan/sextortion', re: /\b(loan|pre.?approved|apk|install.{0,12}app|screen share|anydesk|nude|video.{0,10}leak|blackmail)\b/i, tactic: 'Shame or desperation' },
];

const PRESSURE = /\b(urgent|immediately|right now|within \d+ (minutes|hours)|today only|last chance|do not tell|don'?t tell|keep this confidential|final notice|act now)\b/i;
const ASK = /\b(otp|pin|cvv|password|upi|pay|transfer|deposit|send money|fee|click|link|install|scan.{0,10}qr)\b/i;
const CIVIC = /\b(pothole|garbage|street ?light|water supply|sewage|drain|ration|road|electricity pole|bus|public toilet|stray dog|encroach)\b/i;

const ADVICE = {
  en: {
    scam: 'Do not click, do not reply and never share an OTP. If money has already gone, call 1930 within 24 hours.',
    safe: 'Nothing here matches a known scam pattern. No action needed.',
    civic: 'Send the letter below to the department named, and keep a copy with the date.',
  },
  ta: {
    scam: 'கிளிக் செய்ய வேண்டாம், பதில் அளிக்க வேண்டாம், OTP-ஐ பகிர வேண்டாம். பணம் சென்றிருந்தால் 24 மணி நேரத்திற்குள் 1930-ஐ அழைக்கவும்.',
    safe: 'அறியப்பட்ட மோசடி அறிகுறிகள் எதுவும் இல்லை. நடவடிக்கை தேவையில்லை.',
    civic: 'கீழே உள்ள கடிதத்தை குறிப்பிட்ட துறைக்கு அனுப்பி, தேதியுடன் ஒரு நகலை வைத்திருங்கள்.',
  },
  hi: {
    scam: 'लिंक न खोलें, जवाब न दें और OTP कभी साझा न करें। पैसे जा चुके हों तो 24 घंटे के भीतर 1930 पर कॉल करें।',
    safe: 'यहाँ किसी जाने-पहचाने धोखे का कोई संकेत नहीं है। कोई कार्रवाई ज़रूरी नहीं।',
    civic: 'नीचे दिया पत्र बताए गए विभाग को भेजें और तारीख सहित एक प्रति अपने पास रखें।',
  },
};

const EXPLAIN = {
  en: (type, tactic) => `This reads like a ${type} attempt. The giveaway is the pressure it puts on you: ${tactic.toLowerCase()}. No bank, court or courier works this way.`,
  ta: (type, tactic) => `இது ${type} முயற்சி போல் தெரிகிறது. அடையாளம்: ${tactic}. எந்த வங்கியும், நீதிமன்றமும், கூரியரும் இப்படிச் செயல்படுவதில்லை.`,
  hi: (type, tactic) => `यह ${type} जैसा लगता है। पहचान यही है कि यह दबाव बनाता है: ${tactic}। कोई बैंक, अदालत या कूरियर ऐसे काम नहीं करता।`,
};

/**
 * Score a message the way the server does when it has no Gemini key: count the
 * scam family it matches, the pressure words and the thing it is asking for.
 */
function heuristic(text, lang = 'en') {
  const L = ADVICE[lang] ? lang : 'en';
  const hit = TYPES.find((t) => t.re.test(text));
  const pressure = PRESSURE.test(text);
  const asks = ASK.test(text);
  const civic = !hit && CIVIC.test(text);

  // A scam family alone is weak evidence; family plus a demand is strong.
  let risk = 0;
  if (hit) risk += 45;
  if (pressure) risk += 25;
  if (asks) risk += 25;
  if (hit && asks && pressure) risk += 5;
  risk = Math.min(risk, 97);

  const isScam = Boolean(hit) && (asks || pressure);
  const redacted = redactPII(text);

  if (isScam) {
    return {
      classification: 'SCAM',
      riskScore: risk,
      scamType: hit.type,
      tactic: hit.tactic,
      explanation: EXPLAIN[L](hit.type, hit.tactic),
      advice: ADVICE[L].scam,
      redactedText: redacted,
      cybercrimeDraft:
        'To,\nThe Cyber Crime Cell / National Cyber Crime Reporting Portal (cybercrime.gov.in)\n\n' +
        `Subject: Complaint regarding a suspected ${hit.type} attempt\n\n` +
        'Respected Sir/Madam,\n\n' +
        'I received the message reproduced below, which I believe to be a fraudulent attempt to obtain money or personal information from me. ' +
        'I have not shared any OTP, password or payment with the sender.\n\n' +
        `Suspected category: ${hit.type}\nMethod used: ${hit.tactic}\nTrueSafe risk score: ${risk}/100\n\n` +
        `Message received (personal details removed):\n${redacted.slice(0, 600)}\n\n` +
        'I request that the matter be registered and the sender\'s number be investigated.\n\nYours faithfully,\n[Name]\n[Phone]\n[Date]',
      engine: 'offline-heuristic',
      lang: L,
    };
  }

  if (civic) {
    return {
      classification: 'CIVIC_ISSUE',
      riskScore: 5,
      explanation:
        L === 'ta' ? 'இது ஒரு பொதுப் பிரச்சினை புகார் போல் தெரிகிறது.'
          : L === 'hi' ? 'यह एक नागरिक शिकायत लगती है।'
            : 'This reads like a public civic complaint rather than a scam.',
      advice: ADVICE[L].civic,
      redactedText: redacted,
      grievanceLetter:
        'To,\nThe Concerned Officer,\n[Municipal Corporation / Panchayat Office]\n\n' +
        'Subject: Request for redressal of a civic grievance\n\n' +
        'Respected Sir/Madam,\n\nI wish to bring the following to your notice:\n\n' +
        `${redacted.slice(0, 600)}\n\n` +
        'This has been causing difficulty to residents of the area. I request that the necessary action be taken at the earliest, ' +
        'and that I be informed of the action taken.\n\nYours faithfully,\n[Name]\n[Address]\n[Location]\n[Date]',
      department: 'Municipal Corporation / Panchayat Office',
      engine: 'offline-heuristic',
      lang: L,
    };
  }

  return {
    classification: 'SAFE',
    riskScore: risk > 30 ? 30 : risk,
    explanation:
      L === 'ta' ? 'அறியப்பட்ட மோசடி வடிவங்கள் எதுவும் காணப்படவில்லை.'
        : L === 'hi' ? 'कोई ज्ञात धोखाधड़ी पैटर्न नहीं मिला।'
          : 'No known scam pattern was found in this message.',
    advice: ADVICE[L].safe,
    redactedText: redacted,
    engine: 'offline-heuristic',
    lang: L,
  };
}

const FEED = [
  { id: 1, type: 'Digital arrest', area: 'Chennai', text: 'A caller claiming to be from the CBI told a resident he was under "digital arrest" and must stay on video.', hits: 214 },
  { id: 2, type: 'KYC/OTP', area: 'Madurai', text: 'An SMS claims bank KYC expires today; the link asks for an OTP and a card number.', hits: 167 },
  { id: 3, type: 'Courier parcel', area: 'Coimbatore', text: 'A fake courier call says a parcel with illegal items is held and a fine must be paid by UPI.', hits: 98 },
  { id: 4, type: 'Task job', area: 'Trichy', text: 'A WhatsApp "like and earn" offer asks for a deposit before any payout.', hits: 76 },
  { id: 5, type: 'Voice clone', area: 'Salem', text: 'A caller imitating a relative\'s voice asks for an urgent money transfer.', hits: 59 },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const demoApi = {
  async me() {
    if (!read().authed) throw Object.assign(new Error('Unauthorized'), { status: 401 });
    return { ok: true };
  },
  async login(_phone, otp) {
    await wait(350);
    if (otp !== '1234') throw Object.assign(new Error('Invalid code'), { status: 401 });
    write({ ...read(), authed: true });
    return { ok: true };
  },
  async logout() {
    write({ ...read(), authed: false });
    return { ok: true };
  },
  async analyze(text, lang) {
    await wait(450); // a visible beat, so the scanning state is seen
    const out = heuristic(text, lang);
    const d = read();
    const items = [{ id: Date.now(), ...out, createdAt: new Date().toISOString() }, ...(d.history || [])].slice(0, 50);
    write({ ...d, history: items });
    return out;
  },
  async radar() {
    await wait(250);
    return { items: FEED.map((i) => ({ ...i, text: redactPII(i.text) })) };
  },
  async history() {
    return { items: read().history || [] };
  },
  async upload(file) {
    if (!/^image\/(jpeg|png)$/.test(file?.type || '')) {
      throw Object.assign(new Error('Only JPEG/PNG images up to 2MB are allowed'), { status: 400 });
    }
    return { ok: true, bytes: file.size };
  },
  async deleteMyData() {
    write({});
    return { ok: true };
  },
};

export const DEMO = import.meta.env.VITE_DEMO === '1';
