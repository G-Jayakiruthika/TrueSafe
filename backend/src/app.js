import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import crypto from 'node:crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import {
  enforceHttps, issueCsrf, csrfProtection, sanitizeInput, validate, schemas,
  botGuard, requireAuth, signSession, pick,
} from './security.js';
import { analyze, voiceReply, anonymizeFeed } from './gemini.js';
import { upsertUser, saveScan, listScans, deleteAllUserData } from './db.js';

export const app = express();
app.disable('x-powered-by');
app.set('env', config.isProd ? 'production' : 'development'); // no debug/stack traces in prod
app.set('trust proxy', 1); // Cloud Run terminates TLS

app.use(enforceHttps);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: { 'default-src': ["'none'"], 'frame-ancestors': ["'none'"] },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cors({
  origin(origin, cb) {
    if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  maxAge: 600,
}));

const limiter = (windowMs, max) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests' } });
app.use(limiter(60_000, 120));

/* Voice webhook: parsed BEFORE json size limits of the rest; authenticated by shared secret, not CSRF/cookies. */
app.post('/api/voice', limiter(60_000, 30), express.urlencoded({ extended: false, limit: '20kb' }), express.json({ limit: '20kb' }), async (req, res) => {
  const given = req.get('x-webhook-secret') || req.query.secret || '';
  const a = Buffer.from(String(given)); const b = Buffer.from(config.webhookSecret);
  if (!config.webhookSecret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Twilio: SpeechResult / Body (speed-dial 9 connects here). Vapi: message.transcript.
  const body = req.body || {};
  const raw = body.SpeechResult || body.Body || body.message?.transcript || body.text || '';
  const text = String(raw).slice(0, 1000);
  const lang = ['ta', 'hi', 'en'].includes(body.lang) ? body.lang : (String(body.SpeechLanguage || '').startsWith('ta') ? 'ta' : 'hi');
  if (!text) return res.status(400).json({ error: 'No speech or text received' });
  const reply = await voiceReply(text, lang);
  if (body.SpeechResult !== undefined || body.CallSid) {
    const voice = lang === 'ta' ? 'ta-IN' : lang === 'en' ? 'en-IN' : 'hi-IN';
    const safe = reply.replace(/[<>&]/g, ' ');
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say language="${voice}">${safe}</Say></Response>`);
  } else {
    res.json({ reply, lang });
  }
});

app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());
app.use(hpp());
app.use(sanitizeInput);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/api/csrf-token', issueCsrf);
app.use('/api', csrfProtection);

app.post('/api/auth/login', limiter(15 * 60_000, 10), botGuard, validate(schemas.login), async (req, res) => {
  const { phone, otp } = req.valid;
  // Mocked OTP: '1234' logs in. Disabled unless MOCK_OTP=true.
  if (!config.mockOtp || otp !== '1234') return res.status(401).json({ error: 'Invalid code' });
  const id = await upsertUser(phone);
  res.cookie('ts_session', signSession(id), { httpOnly: true, secure: config.isProd, sameSite: 'strict', maxAge: 12 * 3600_000, path: '/' });
  res.json({ ok: true });
});
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('ts_session'); res.json({ ok: true }); });
app.get('/api/me', requireAuth, (_req, res) => res.json({ ok: true }));

app.post('/api/analyze', requireAuth, limiter(60_000, 20), botGuard, validate(schemas.analyze), async (req, res) => {
  const out = await analyze(req.valid.text, req.valid.lang);
  await saveScan(req.userId, out);
  res.json(pick(out, ['classification', 'riskScore', 'scamType', 'tactic', 'explanation', 'advice', 'redactedText', 'cybercrimeDraft', 'grievanceLetter', 'department', 'engine', 'lang']));
});

app.get('/api/history', requireAuth, async (req, res) => res.json({ items: await listScans(req.userId) }));

const FEED = [
  { id: 1, type: 'Digital arrest', area: 'Chennai', text: 'Caller claiming to be from CBI told Mr. Raman Iyer 98400 12345 he is under digital arrest.', hits: 214 },
  { id: 2, type: 'KYC/OTP', area: 'Madurai', text: 'SMS says bank KYC expires today; link asks for OTP and card number 4111111111111111.', hits: 167 },
  { id: 3, type: 'Courier parcel', area: 'Coimbatore', text: 'Fake courier call: parcel with illegal items held, pay fine via UPI ravi@okaxis.', hits: 98 },
  { id: 4, type: 'Task job', area: 'Trichy', text: 'WhatsApp "like and earn" tasks that ask for a deposit before payout.', hits: 76 },
  { id: 5, type: 'Voice clone', area: 'Salem', text: 'Caller imitates a relative\'s voice asking for urgent money transfer.', hits: 59 },
];
app.get('/api/radar', requireAuth, async (_req, res) => {
  const items = await anonymizeFeed(FEED);
  res.json({ items: items.map((i) => pick(i, ['id', 'type', 'area', 'text', 'hits'])) });
});

/* Restricted uploads: images only, 2MB, magic-byte verified, kept in memory, never written to disk. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 } });
const MAGIC = [[0xff, 0xd8, 0xff], [0x89, 0x50, 0x4e, 0x47]];
app.post('/api/upload', requireAuth, limiter(60_000, 10), upload.single('photo'), (req, res) => {
  const f = req.file;
  const okType = f && ['image/jpeg', 'image/png'].includes(f.mimetype) && MAGIC.some((m) => m.every((b, i) => f.buffer[i] === b));
  if (!okType) return res.status(400).json({ error: 'Only JPEG/PNG images up to 2MB are allowed' });
  res.json({ ok: true, bytes: f.size });
});

app.delete('/api/me/data', requireAuth, async (req, res) => {
  await deleteAllUserData(req.userId);
  res.clearCookie('ts_session');
  res.json({ ok: true });
});

app.use('/api/admin', requireAuth, (_req, res) => res.status(403).json({ error: 'Forbidden' }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// Generic error handler: never leaks stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.message === 'CORS blocked' ? 403 : (err.status || 400);
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: status === 403 ? 'Forbidden' : 'Request failed' });
});
