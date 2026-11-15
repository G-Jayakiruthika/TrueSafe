# TrueSafe – Security Report

Generated 2026-11-15. Verified by `node run-security-audit.js` (14/14 checks pass; live requests against the Express app booted in production mode, plus static scans).

## 1. Backend hardening (`backend/src`)
| Control | Implementation |
|---|---|
| Rate limiting | `express-rate-limit`: 120/min global, 20/min `/api/analyze`, 10/15 min login, 30/min voice webhook |
| HTTPS | Production rejects non-HTTPS with 426 (Cloud Run `x-forwarded-proto`); HSTS 2 yrs + preload |
| CORS | Explicit allow-list from `ALLOWED_ORIGINS`; methods/headers restricted; no wildcard |
| Headers | `helmet` (CSP `default-src 'none'`, frame-ancestors none, no-referrer, CORP); `x-powered-by` disabled |
| CSRF | HMAC-signed double-submit token (httpOnly SameSite=Strict cookie + `X-CSRF-Token` header, timing-safe compare) |
| Auth | Mock phone+OTP (`1234`, only when `MOCK_OTP=true`); JWT in httpOnly/SameSite=Strict cookie; tenant id comes **only** from the verified token |
| Validation | `zod` `.strict()` schemas → unknown fields (mass assignment/tampering) rejected with 400; `hpp`; 50 KB body cap |
| XSS | Server-side HTML escaping of all string input; React escapes on render; JSON-only API |
| SQLi | All DB access via `supabase-js` (parameterised PostgREST), every query scoped by `user_id`; no string-built SQL |
| Uploads | Multer memory storage, 1 file, 2 MB, JPEG/PNG only + magic-byte check, never written to disk |
| Bot protection | UA deny-list, hidden honeypot field (`website`), strict login/analyze limits |
| Debug off | `NODE_ENV=production`, generic error handler, no stack traces |
| Secrets | `.env` (git-ignored) / Secret Manager on Cloud Run; app refuses to boot in prod with weak/missing secrets; frontend contains no secrets |
| Response trimming | `pick()` whitelists response fields |
| Admin | `/api/admin/*` requires auth and returns 403 for all users |

## 2. AI engine (Gemini 2.5 Flash)
- `backend/src/gemini.js` calls `gemini-2.5-flash` via `@google/genai` with a JSON `responseSchema` returning `SCAM | CIVIC_ISSUE | SAFE`, scam type, manipulation tactic, 1930 cybercrime draft, Urimai grievance letter, English/Tamil/Hindi output.
- PII (phone, Aadhaar, PAN, account, UPI, email, OTP) is redacted **before** the model call and again on output. User text is wrapped as untrusted data (prompt-injection mitigation).
- Without `GEMINI_API_KEY` (or on API error) an offline heuristic answers and the UI shows "Offline mode".
- `/api/voice` webhook (Twilio form-data or Vapi JSON): shared-secret authenticated (timing-safe), 20 KB cap, returns TwiML `<Say>` in ta-IN/hi-IN/en-IN or JSON.

## 3. Database hardening (`supabase/001_schema.sql`)
- RLS **enabled and forced** on `profiles`, `scans`, `family_links`, `consents`; owner-only policies (`auth.uid()`); `anon` has no table privileges.
- Column-level grants block mass assignment; `check` constraints on enums/lengths.
- Argon2id for fallback passwords (`db.js`, OWASP params); a trigger rejects any non-`$argon2id$` hash. Phone stored only as keyed hash.
- `delete_my_data()` RPC + cascade deletes for right to erasure.
- Public (anon) key is safe to ship only because of RLS; service-role key is server-only.

## 4. CI/CD & Cloud Run readiness
- `.github/workflows/deploy.yml`: CodeQL (security-extended, weekly), Gitleaks full-history secret scan, `npm audit`, build + security audit, then deploy on `main` via Workload Identity Federation (no JSON keys) to Cloud Run with secrets from Secret Manager and `MOCK_OTP=false`.
- `.github/dependabot.yml` for npm/actions/docker.
- Multi-stage non-root `Dockerfile`, listens on `$PORT` (8080).
- Git history purge is intentionally **manual** (rotate the secret first, then `git filter-repo`), documented in the workflow.

## 5. Compliance & accessibility
- Pages: Privacy, Terms, Refund, Cookie policies; cookie consent banner (analytics off by default); consent checkbox on login; data minimisation; free service, no hidden fees; no fake reviews; **Delete My Data** in Settings.
- WCAG AAA: all palette text/accent pairs designed ≥ 7:1 in dark and bright modes (muted text ≥ 9:1), skip link, visible focus rings, aria-labels, `role="img"` + label on the 3D canvas/avatar, alt text on images, keyboard-operable menus/switches/dialogs (Esc closes), `prefers-reduced-motion` honoured.

## 6. Dependency status
`npm audit --omit=dev` : 0 vulnerabilities in the frontend (react-router-dom upgraded to v7) and 0 high/critical in the backend.

## 7. Known gaps / before production
- **Business details are placeholders** (legal entity, address, jurisdiction): complete them and have counsel review policies.
- Mock OTP is for demos; use Supabase Auth phone provider (Twilio Verify) and set `MOCK_OTP=false`. The Express layer uses its own JWT; wire Supabase JWTs if you want RLS enforced for browser-direct queries (the server currently uses the service key and scopes queries manually).
- In-memory store is used if Supabase env vars are absent (data lost on restart; rate-limit counters are per instance — use Redis for multi-instance limits).
- Hero video: add `frontend/public/hero.mp4`/`hero.webm`; an animated canvas fallback plays until then.
- Connected Apps toggles are mocks; Radar feed is seeded sample data anonymised through Gemini.
- Contrast was verified by design values, not an automated axe/Lighthouse run; run one before launch.
- Set `ALLOWED_ORIGINS` and host the frontend (e.g. Firebase Hosting/Cloud Storage) with a strict CSP header.
