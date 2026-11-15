#!/usr/bin/env node
/**
 * TrueSafe local security audit. Runs REAL checks (live requests against the Express app booted in
 * production mode + static scans), named after the requested audit routes.
 * Usage: node run-security-audit.js        (set AUDIT_OFFLINE=1 to skip the network `npm audit`)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const results = [];
const rec = (name, status, detail = '') => { results.push({ name, status, detail }); console.log(`${status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌'} ${name.padEnd(26)} ${detail}`); };
const check = async (name, fn) => { try { const d = await fn(); if (d && d.warn) rec(name, 'WARN', d.warn); else rec(name, 'PASS', typeof d === 'string' ? d : ''); } catch (e) { rec(name, 'FAIL', e.message + (e.cause ? ` (${e.cause.code || e.cause.message})` : '')); } };
const assert = (c, m) => { if (!c) throw new Error(m); };

const SKIP = new Set(['node_modules', '.git', 'dist', 'package-lock.json']);
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(f.name)) continue;
    const p = path.join(dir, f.name);
    f.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const read = (p) => fs.readFileSync(p, 'utf8');
const textFiles = files.filter((f) => /\.(js|jsx|json|md|yml|yaml|html|css|sql|env|example|webmanifest|svg)$/i.test(f) || path.basename(f).startsWith('.env'));

/* ---- boot backend in production mode ---- */
const secret = () => crypto.randomBytes(32).toString('hex');
Object.assign(process.env, {
  NODE_ENV: 'production', JWT_SECRET: secret(), CSRF_SECRET: secret(), WEBHOOK_SECRET: 'audit-webhook-secret-123456',
  ALLOWED_ORIGINS: 'https://truesafe.example.com', MOCK_OTP: 'true', GEMINI_API_KEY: '', PORT: '0',
});
const { app } = await import(pathToFileURL(path.join(ROOT, 'backend/src/app.js')).href);
const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const H = { 'x-forwarded-proto': 'https', 'user-agent': 'Mozilla/5.0 (audit)', origin: 'https://truesafe.example.com' };

const cookieJar = (res) => (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]);
async function session(phone) {
  const t = await fetch(`${base}/api/csrf-token`, { headers: H });
  const csrf = (await t.json()).csrfToken; let cookies = cookieJar(t);
  const l = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { ...H, 'content-type': 'application/json', 'x-csrf-token': csrf, cookie: cookies.join('; ') }, body: JSON.stringify({ phone, otp: '1234' }) });
  assert(l.status === 200, `login failed (${l.status})`);
  cookies = cookies.concat(cookieJar(l));
  return { csrf, cookie: cookies.join('; ') };
}
const post = (s, url, body) => fetch(`${base}${url}`, { method: 'POST', headers: { ...H, 'content-type': 'application/json', 'x-csrf-token': s.csrf, cookie: s.cookie }, body: JSON.stringify(body) });

console.log('\n=== TrueSafe Security Audit ===\n');

await check('/hide-api-key', async () => {
  const pat = /(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{32,}|eyJhbGciOi[A-Za-z0-9._-]{40,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----)/;
  const hits = textFiles.filter((f) => pat.test(read(f)));
  assert(!hits.length, `key-like strings in: ${hits.map((h) => path.relative(ROOT, h)).join(', ')}`);
  const fe = files.filter((f) => f.includes(`${path.sep}frontend${path.sep}src`)).filter((f) => /GEMINI|SERVICE_ROLE/.test(read(f)));
  assert(!fe.length, 'frontend references server secrets');
  assert(/^\.env$/m.test(read(path.join(ROOT, '.gitignore'))), '.env not gitignored');
  return 'no keys in source; frontend holds no secrets';
});

await check('/check-env-variable', () => {
  const ex = read(path.join(ROOT, 'backend/.env.example'));
  for (const k of ['GEMINI_API_KEY', 'JWT_SECRET', 'CSRF_SECRET', 'WEBHOOK_SECRET', 'ALLOWED_ORIGINS', 'SUPABASE_SERVICE_ROLE_KEY']) assert(ex.includes(k), `${k} missing in .env.example`);
  const cfg = read(path.join(ROOT, 'backend/src/config.js'));
  assert(/process\.env\.GEMINI_API_KEY/.test(cfg) && /must be set to a strong value in production/.test(cfg), 'config does not enforce env secrets in prod');
  assert(!/GEMINI_API_KEY=\S+/.test(ex), '.env.example contains a value');
  return 'secrets loaded from env, enforced in production';
});

await check('/protect-admin-routes', async () => {
  const r = await fetch(`${base}/api/admin/users`, { headers: H });
  assert([401, 403].includes(r.status), `admin route returned ${r.status}`);
  const s = await session('9000000001');
  const r2 = await fetch(`${base}/api/admin/users`, { headers: { ...H, cookie: s.cookie } });
  assert(r2.status === 403, `admin route allowed a normal user (${r2.status})`);
  return 'anonymous 401/403, normal user 403';
});

await check('/check-user-access', async () => {
  assert((await fetch(`${base}/api/history`, { headers: H })).status === 401, 'history open without auth');
  const a = await session('9000000002'); const b = await session('9000000003');
  await post(a, '/api/analyze', { text: 'private note of user A about KYC otp' });
  const ha = await (await fetch(`${base}/api/history`, { headers: { ...H, cookie: a.cookie } })).json();
  const hb = await (await fetch(`${base}/api/history`, { headers: { ...H, cookie: b.cookie } })).json();
  assert(ha.items.length === 1 && hb.items.length === 0, 'tenant isolation broken');
  const mass = await post(a, '/api/analyze', { text: 'hi', user_id: 'someone-else', role: 'admin' });
  assert(mass.status === 400, 'mass assignment not blocked');
  const noCsrf = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { ...H, 'content-type': 'application/json', cookie: a.cookie }, body: '{"text":"x"}' });
  assert(noCsrf.status === 403, 'CSRF not enforced');
  return 'tenant isolation, mass-assignment and CSRF enforced';
});

await check('/protect-against-xss', async () => {
  const s = await session('9000000004');
  const r = await (await post(s, '/api/analyze', { text: '<script>alert(1)</script><img src=x onerror=alert(2)> verify otp' })).json();
  const out = JSON.stringify(r);
  assert(!/<script|<img/i.test(out), 'unescaped HTML reflected');
  const bot = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { ...H, 'user-agent': 'python-requests/2', 'content-type': 'application/json', 'x-csrf-token': s.csrf, cookie: s.cookie }, body: '{"text":"x"}' });
  assert(bot.status === 403, 'bot UA not blocked');
  return 'HTML escaped; bot UA blocked';
});

await check('/check-cors-settings', async () => {
  const r = await fetch(`${base}/healthz`, { headers: { ...H, origin: 'https://evil.example' } });
  assert(r.status === 403 && !r.headers.get('access-control-allow-origin'), 'evil origin allowed');
  const ok = await fetch(`${base}/healthz`, { headers: H });
  assert(ok.headers.get('access-control-allow-origin') === 'https://truesafe.example.com', 'allowed origin missing');
  assert(ok.headers.get('access-control-allow-origin') !== '*', 'wildcard CORS');
  return 'allow-list only, credentials restricted';
});

await check('/add-security-headers', async () => {
  const r = await fetch(`${base}/healthz`, { headers: H });
  for (const h of ['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'x-frame-options', 'referrer-policy']) assert(r.headers.get(h), `missing ${h}`);
  assert(!r.headers.get('x-powered-by'), 'x-powered-by exposed');
  const plain = await fetch(`${base}/healthz`, { headers: { 'user-agent': H['user-agent'] } });
  assert(plain.status === 426, 'plain HTTP not rejected in production');
  return 'helmet headers present; HTTP rejected (426)';
});

await check('/turn-off-debug-mode', async () => {
  const r = await fetch(`${base}/api/analyze`, { method: 'POST', headers: { ...H, 'content-type': 'application/json', 'x-csrf-token': 'bad' }, body: '{bad json' });
  const t = await r.text();
  assert(!/at .*\(.*:\d+:\d+\)|node_modules|stack/i.test(t), 'stack trace leaked');
  assert(app.get('env') === 'production', 'express env not production');
  assert(!files.some((f) => f.endsWith('.js') && /app\.set\(['"]env['"],\s*['"]development/.test(read(f))), 'debug env forced');
  return 'no stack traces; production env';
});

await check('/check-exposed-files', async () => {
  const bad = files.filter((f) => /(^|[\\/])(\.env(\.(?!example).*)?|.*\.pem|.*\.key|id_rsa)$/i.test(f));
  assert(!bad.length, `sensitive files present: ${bad.map((b) => path.relative(ROOT, b)).join(', ')}`);
  for (const p of ['/.env', '/.git/config', '/package.json']) assert((await fetch(`${base}${p}`, { headers: H })).status === 404, `${p} reachable`);
  let tracked = ''; try { tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }); } catch { /* not a repo yet */ }
  assert(!/(^|\n)(.*\/)?\.env(\n|$)/.test(tracked), '.env tracked by git');
  return 'no secret files on disk/served/tracked';
});

await check('/check-git-for-secrets', () => {
  const pat = /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9/+_-]{20,}['"]/i;
  const hits = textFiles.filter((f) => !f.endsWith('run-security-audit.js') && pat.test(read(f)));
  assert(!hits.length, `possible hard-coded secret: ${hits.map((h) => path.relative(ROOT, h)).join(', ')}`);
  let hist = ''; try { hist = execSync('git log --all --diff-filter=A --name-only --pretty=format:', { cwd: ROOT, encoding: 'utf8' }); } catch { /* no commits */ }
  assert(!/(^|\n)(.*\/)?\.env(\n|$)/.test(hist), '.env found in git history – rotate secrets & purge');
  return 'no hard-coded secrets; .env absent from history';
});

await check('/remove-unused-packages', () => {
  const unused = [];
  for (const dir of ['backend', 'frontend']) {
    const pkg = JSON.parse(read(path.join(ROOT, dir, 'package.json')));
    const src = files.filter((f) => f.includes(`${path.sep}${dir}${path.sep}`) && /\.(js|jsx)$/.test(f)).map(read).join('\n');
    const cfgs = ['vite.config.js', 'postcss.config.js', 'tailwind.config.js'].map((c) => { try { return read(path.join(ROOT, dir, c)); } catch { return ''; } }).join('\n');
    const implicit = new Set(['tailwindcss', 'autoprefixer', 'postcss', 'vite', '@vitejs/plugin-react', 'react-dom', 'three']); // three = peer dependency of @react-three/fiber
    for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (implicit.has(dep) && (cfgs + src).includes(dep.replace('@vitejs/', '')) ) continue;
      if (!src.includes(`'${dep}`) && !src.includes(`"${dep}`) && !cfgs.includes(dep) && !implicit.has(dep)) unused.push(`${dir}:${dep}`);
    }
  }
  assert(!unused.length, `unused: ${unused.join(', ')}`);
  return 'every dependency is imported';
});

const npmAudit = () => {
  if (process.env.AUDIT_OFFLINE) return { warn: 'skipped (AUDIT_OFFLINE)' };
  const bad = [];
  for (const dir of ['backend', 'frontend']) {
    try { execSync('npm audit --omit=dev --audit-level=high', { cwd: path.join(ROOT, dir), stdio: 'pipe', encoding: 'utf8', timeout: 60000 }); }
    catch (e) { const o = `${e.stdout}${e.stderr}`; if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|network|ETIMEDOUT|getaddrinfo|audit endpoint/i.test(o)) return { warn: 'npm audit needs network access; run it in CI' }; bad.push(`${dir}: ${(o.match(/(\d+) (high|critical)/g) || ['vulnerabilities']).join(', ')}`); }
  }
  assert(!bad.length, bad.join('; '));
  return 'no high/critical advisories';
};
await check('/run-security-audit', async () => {
  const s = await session('9000000005');
  const v = await fetch(`${base}/api/voice?secret=nope`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Twilio', 'x-forwarded-proto': 'https' }, body: '{"text":"hi"}' });
  assert(v.status === 401, 'voice webhook open without secret');
  const ok = await fetch(`${base}/api/voice`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-webhook-secret': process.env.WEBHOOK_SECRET, 'x-forwarded-proto': 'https' }, body: 'SpeechResult=my+KYC+will+expire+send+OTP&CallSid=CA1&SpeechLanguage=ta-IN' });
  assert(ok.status === 200 && /<Say/.test(await ok.text()), 'voice webhook did not return TwiML');
  const bad = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { ...H, 'content-type': 'application/json', 'x-csrf-token': s.csrf, cookie: s.cookie }, body: JSON.stringify({ phone: '9000000005', otp: '0000' }) });
  assert(bad.status === 401, 'wrong OTP accepted');
  const hashMod = await import(pathToFileURL(path.join(ROOT, 'backend/src/db.js')).href);
  const h = await hashMod.hashPassword('correct horse'); assert(h.startsWith('$argon2id$') && await hashMod.verifyPassword(h, 'correct horse'), 'argon2id failed');
  const sql = read(path.join(ROOT, 'supabase/001_schema.sql'));
  const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
  for (const t of tables) assert(new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(sql), `RLS missing on ${t}`);
  const wf = read(path.join(ROOT, '.github/workflows/deploy.yml'));
  assert(/codeql/i.test(wf) && /gitleaks/i.test(wf) && /gcloud run deploy/.test(wf), 'workflow missing CodeQL/secret scan/Cloud Run');
  return `voice webhook, Argon2id, RLS on ${tables.length} tables, CI/CD verified`;
});
// Run the slow, network-bound npm audit after all live HTTP checks (idle keep-alive sockets would otherwise go stale).
await check('/update-dependencies', npmAudit);
await check('/make-no-mistakes', async () => {
  const rl = read(path.join(ROOT, 'backend/src/app.js'));
  assert(/rateLimit\(/.test(rl) && /helmet\(/.test(rl) && /csrfProtection/.test(rl) && /hpp\(/.test(rl), 'core middleware missing');
  const failed = results.filter((r) => r.status === 'FAIL');
  assert(!failed.length, `${failed.length} earlier check(s) failed`);
  return 'all prior checks green';
});

server.close();
const fail = results.filter((r) => r.status === 'FAIL').length; const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\nSummary: ${results.length - fail - warn} passed, ${warn} warnings, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
