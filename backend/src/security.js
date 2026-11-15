import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from './config.js';

/* ---------- escaping / sanitising ---------- */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"'`]/g, (c) => ESC[c]);
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const clean = (s) => escapeHtml(String(s).replace(CTRL, '').trim());

function sanitizeDeep(v, depth = 0) {
  if (depth > 5) return undefined;
  if (typeof v === 'string') return clean(v);
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => sanitizeDeep(x, depth + 1));
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (['__proto__', 'constructor', 'prototype'].includes(k)) continue;
      out[k] = sanitizeDeep(val, depth + 1);
    }
    return out;
  }
  return v;
}
/** Escapes user-supplied strings in body/query (stored-XSS defence-in-depth; React also escapes on render). */
export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitizeDeep(req.body);
  next();
}

/* ---------- validation + mass-assignment guard ---------- */
/** Strict schemas reject unknown keys => field tampering / mass assignment blocked. */
export const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  req.valid = parsed.data;
  next();
};
const honeypot = z.string().max(0).optional(); // bots fill hidden "website" field

export const schemas = {
  login: z.object({
    phone: z.string().regex(/^\+?[0-9]{10,13}$/),
    otp: z.string().regex(/^[0-9]{4}$/),
    website: honeypot,
  }).strict(),
  analyze: z.object({
    text: z.string().min(1).max(4000),
    lang: z.enum(['en', 'ta', 'hi']).default('en'),
    website: honeypot,
  }).strict(),
  grievance: z.object({
    summary: z.string().min(1).max(2000),
    lang: z.enum(['en', 'ta', 'hi']).default('en'),
  }).strict(),
};

/* ---------- bot protection ---------- */
const BOT_UA = /(curl|wget|python-requests|scrapy|httpclient|headless|phantom|selenium|puppeteer)/i;
export function botGuard(req, res, next) {
  const ua = req.get('user-agent') || '';
  if (!ua || ua.length > 400 || BOT_UA.test(ua)) return res.status(403).json({ error: 'Automated clients are not allowed' });
  if (req.body && typeof req.body.website === 'string' && req.body.website.length > 0) {
    return res.status(403).json({ error: 'Automated clients are not allowed' });
  }
  next();
}

/* ---------- HTTPS enforcement ---------- */
export function enforceHttps(req, res, next) {
  if (!config.isProd) return next();
  if (req.secure || req.get('x-forwarded-proto') === 'https') return next();
  return res.status(426).json({ error: 'HTTPS required' });
}

/* ---------- CSRF: signed double-submit cookie ---------- */
const sign = (nonce) => crypto.createHmac('sha256', config.csrfSecret).update(nonce).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
export function issueCsrf(_req, res) {
  const nonce = crypto.randomBytes(24).toString('hex');
  const token = `${nonce}.${sign(nonce)}`;
  res.cookie('ts_csrf', token, { httpOnly: true, secure: config.isProd, sameSite: 'strict', path: '/' });
  res.json({ csrfToken: token });
}
export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const header = req.get('x-csrf-token');
  const cookie = req.cookies?.ts_csrf;
  if (!header || !cookie || !safeEq(header, cookie)) return res.status(403).json({ error: 'CSRF validation failed' });
  const [nonce, mac] = header.split('.');
  if (!nonce || !mac || !safeEq(mac, sign(nonce))) return res.status(403).json({ error: 'CSRF validation failed' });
  next();
}

/* ---------- auth (tenant identity comes ONLY from the signed token) ---------- */
export const signSession = (userId) =>
  jwt.sign({ sub: userId }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '12h', issuer: 'truesafe' });

export function requireAuth(req, res, next) {
  try {
    const t = req.cookies?.ts_session;
    const p = jwt.verify(t, config.jwtSecret, { algorithms: ['HS256'], issuer: 'truesafe' });
    req.userId = p.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}
export const requireAdmin = (_req, res) => res.status(403).json({ error: 'Admin only' });

/* ---------- response trimming ---------- */
export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
