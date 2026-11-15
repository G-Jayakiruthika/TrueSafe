const BASE = import.meta.env.VITE_API_URL || '';
let csrf = null;

async function token() {
  if (!csrf) {
    const r = await fetch(`${BASE}/api/csrf-token`, { credentials: 'include' });
    csrf = (await r.json()).csrfToken;
  }
  return csrf;
}

async function req(path, opts = {}) {
  const method = opts.method || 'GET';
  const headers = { ...(opts.headers || {}) };
  if (method !== 'GET') headers['X-CSRF-Token'] = await token();
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...opts, headers });
  if (res.status === 403) csrf = null; // refresh on next call
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  me: () => req('/api/me'),
  login: (phone, otp) => req('/api/auth/login', json('POST', { phone, otp, website: '' })),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  analyze: (text, lang) => req('/api/analyze', json('POST', { text, lang, website: '' })),
  radar: () => req('/api/radar'),
  history: () => req('/api/history'),
  upload: (file) => { const f = new FormData(); f.append('photo', file); return req('/api/upload', { method: 'POST', body: f }); },
  deleteMyData: () => req('/api/me/data', { method: 'DELETE' }),
};
