import { Link, useParams } from 'react-router-dom';
import TextReveal from '../components/TextReveal.jsx';

const UPDATED = '15 November 2026';
const DOCS = {
  privacy: ['Privacy Policy', [
    ['Who we are', 'TrueSafe is operated by [Registered legal entity – to be completed before launch]. Contact the grievance officer at grievance@truesafe.example.'],
    ['Data we collect (and nothing more)', 'Your mobile number (stored only as a keyed hash), the messages you choose to scan (stored after personal data such as phone, account, Aadhaar, PAN, UPI and OTP values is redacted), and optional photos you attach to a grievance (processed in memory, not stored).'],
    ['Why we use it', 'To detect scams, draft civic grievances, show your own history, and keep the service secure. We do not sell data and do not show ads.'],
    ['AI processing', 'Message text is redacted and then sent to Google’s Gemini 2.5 Flash model through the Gemini API to produce the analysis. Content is not used by us for profiling.'],
    ['Your rights', 'You can access, correct and delete your data at any time. Use Settings → Delete My Data for immediate erasure, or email us. Consent can be withdrawn without penalty (DPDP Act 2023, GDPR-aligned).'],
    ['Security', 'Encryption in transit (HTTPS/HSTS), Row Level Security for strict tenant isolation, Argon2id for any password hashes, rate limiting, CSRF and input validation.'],
    ['Retention', 'Scan history is kept until you delete it or for at most 12 months of inactivity.'],
  ]],
  terms: ['Terms of Service', [
    ['Acceptance', 'By using TrueSafe you agree to these terms. You must be 18+ or use the app with a guardian.'],
    ['What TrueSafe is', 'An assistive tool. AI results can be wrong; they are not legal advice and not a substitute for reporting to 1930 or cybercrime.gov.in.'],
    ['Acceptable use', 'Do not abuse the service, attempt to bypass security, scrape, or submit unlawful content.'],
    ['No fees', 'TrueSafe is free. There are no hidden charges, subscriptions or in-app purchases.'],
    ['Liability', 'To the extent permitted by law, we are not liable for losses from reliance on AI-generated analysis. Nothing limits liability that cannot be excluded by law.'],
    ['Governing law', 'Laws of India. Disputes: courts at [city – to be completed].'],
  ]],
  refund: ['Refund Policy', [
    ['Free service', 'TrueSafe currently charges nothing, so there is nothing to refund.'],
    ['If we ever introduce paid features', 'We will show the full price before you pay, never auto-renew without clear consent, and offer a refund within 7 days of purchase if the feature does not work as described.'],
    ['Contact', 'billing@truesafe.example'],
  ]],
  cookies: ['Cookie Policy', [
    ['Essential cookies', 'ts_session (login, httpOnly, 12 hours) and ts_csrf (security token). They are required for the app to work.'],
    ['Optional cookies', 'Analytics are off by default and enabled only if you choose “Accept analytics too”. We currently run no third-party trackers.'],
    ['Local storage', 'Theme, cookie choice, family list and a PII-redacted scan history are stored on your device only; Delete My Data clears them.'],
    ['Change your choice', 'Clear site data in your browser to see the consent banner again.'],
  ]],
};

export default function Legal() {
  const { doc } = useParams(); const d = DOCS[doc];
  if (!d) return <p>Document not found. <Link className="underline" to="/legal/privacy">Privacy Policy</Link></p>;
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/" className="underline">← Back to TrueSafe</Link>
      <TextReveal text={d[0]} className="grad-text text-4xl font-extrabold" />
      <p className="text-muted">Last updated: {UPDATED}. Template text — have it reviewed by counsel and complete the bracketed business details before public launch.</p>
      {d[1].map(([h, p]) => (<section key={h} className="card p-5"><h2 className="text-xl font-bold">{h}</h2><p className="mt-2 text-lg">{p}</p></section>))}
    </article>
  );
}
