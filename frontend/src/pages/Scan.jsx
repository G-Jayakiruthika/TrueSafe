import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, Copy, Users, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useTheme } from '../lib/theme.jsx';
import { addHistory } from '../lib/history.js';
import VanishInput from '../components/VanishInput.jsx';
import Avatar3D from '../components/Avatar3D.jsx';
import TextReveal from '../components/TextReveal.jsx';
import { useNavigate } from 'react-router-dom';

const LANGS = [['en', 'English'], ['ta', 'தமிழ்'], ['hi', 'हिन्दी']];

export default function Scan() {
  const { setState } = useTheme(); const nav = useNavigate();
  const [lang, setLang] = useState('en'); const [busy, setBusy] = useState(false); const [res, setRes] = useState(null);
  const [err, setErr] = useState(''); const [draft, setDraft] = useState(false); const [copied, setCopied] = useState(false);

  useEffect(() => () => setState('neutral'), [setState]);

  const mood = busy ? 'scanning' : res?.classification === 'SCAM' ? 'angry' : res?.classification === 'SAFE' ? 'happy' : 'calm';

  const run = async (text) => {
    setBusy(true); setErr(''); setRes(null); setDraft(false);
    try {
      const r = await api.analyze(text, lang);
      setRes(r);
      setState(r.classification === 'SCAM' ? 'scam' : r.classification === 'CIVIC_ISSUE' ? 'civic' : 'safe');
      addHistory({ classification: r.classification, text: r.redactedText?.slice(0, 120) });
      if (r.classification === 'CIVIC_ISSUE') localStorage.setItem('ts_report', JSON.stringify({ letter: r.grievanceLetter, department: r.department, summary: r.redactedText?.slice(0, 140), from: 'Scan' }));
    } catch (e) { setErr(e.status === 401 ? 'Session expired. Please sign in again.' : 'Analysis failed. Please try again.'); setState('neutral'); } finally { setBusy(false); }
  };
  const copy = async (t) => { await navigator.clipboard?.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-6">
      <TextReveal text="Scan anything suspicious" className="grad-text text-center text-4xl font-extrabold" />
      <Avatar3D mood={mood} size={200} />
      <div role="radiogroup" aria-label="Response language" className="flex justify-center gap-2">
        {LANGS.map(([k, l]) => (
          <button key={k} role="radio" aria-checked={lang === k} onClick={() => setLang(k)} className={`btn !min-h-[44px] !py-2 ${lang === k ? 'bg-accent text-onaccent' : 'border border-fg/40'}`}>{l}</button>
        ))}
      </div>
      <VanishInput onSubmit={run} lang={lang} busy={busy} />
      <div aria-live="polite">
        {busy && <p className="text-center text-lg font-semibold" role="status">Scanning with Gemini 2.5 Flash…</p>}
        {err && <p role="alert" className="text-center font-semibold">{err}</p>}
      </div>
      <AnimatePresence>
        {res && (
          <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4 p-6" aria-label="Analysis result">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent px-4 py-1 text-lg font-extrabold text-onaccent">{res.classification === 'CIVIC_ISSUE' ? 'CIVIC ISSUE' : res.classification}</span>
              <span className="font-semibold">Risk {res.riskScore}/100</span>
              {res.engine && <span className="ml-auto text-sm text-muted">{res.engine === 'offline-heuristic' ? 'Offline mode (no API key)' : res.engine}</span>}
            </div>
            {res.classification === 'SCAM' && (
              <>
                <h2 className="text-2xl font-bold">{res.scamType}</h2>
                <p><strong>Manipulation tactic:</strong> {res.tactic}</p>
              </>
            )}
            <p className="text-lg">{res.explanation}</p>
            <p className="font-semibold">{res.advice}</p>
            <details className="text-muted"><summary className="cursor-pointer font-semibold">Redacted text (personal data removed)</summary><p className="mt-2 break-words">{res.redactedText}</p></details>

            {res.classification === 'SCAM' && (
              <div className="space-y-3">
                <button className="btn-primary" onClick={() => setDraft(!draft)} aria-expanded={draft}><Phone aria-hidden="true" /> 1930 Cybercrime Draft</button>
                {draft && (
                  <div className="rounded-2xl border border-fg/30 p-4">
                    <pre className="whitespace-pre-wrap font-sans">{res.cybercrimeDraft}</pre>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button className="btn-ghost" onClick={() => copy(res.cybercrimeDraft)}><Copy size={18} aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button>
                      <a className="btn-ghost" href="tel:1930">Call 1930</a>
                    </div>
                  </div>
                )}
              </div>
            )}
            {res.classification === 'CIVIC_ISSUE' && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Urimai grievance letter{res.department ? ` → ${res.department}` : ''}</h2>
                <pre className="whitespace-pre-wrap rounded-2xl border border-fg/30 p-4 font-sans">{res.grievanceLetter}</pre>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-ghost" onClick={() => copy(res.grievanceLetter)}><Copy size={18} aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button>
                  <button className="btn-primary" onClick={() => nav('/family')}><Users aria-hidden="true" /> Open Urimai Action Kit</button>
                </div>
              </div>
            )}
            {res.classification === 'SAFE' && <p className="flex items-center gap-2 font-bold"><ShieldCheck aria-hidden="true" /> Looks safe. Stay alert anyway.</p>}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
