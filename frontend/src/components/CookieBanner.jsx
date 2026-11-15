import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [choice, setChoice] = useState(() => localStorage.getItem('ts_cookie'));
  if (choice) return null;
  const set = (v) => { localStorage.setItem('ts_cookie', v); setChoice(v); };
  return (
    <section role="dialog" aria-label="Cookie consent" className="card fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl p-5 shadow-2xl">
      <h2 className="text-lg font-bold">Cookies &amp; your choices</h2>
      <p className="mt-1 text-muted">We use only essential cookies (login session and security token). Optional analytics stay off unless you accept. See our <Link className="underline" to="/legal/cookies">Cookie Policy</Link>.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => set('essential')}>Essential only</button>
        <button className="btn-ghost" onClick={() => set('all')}>Accept analytics too</button>
      </div>
    </section>
  );
}
