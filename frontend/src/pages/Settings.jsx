import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { clearLocalData } from '../lib/history.js';
import { useTheme } from '../lib/theme.jsx';
import TextReveal from '../components/TextReveal.jsx';

export default function Settings({ onDeleted }) {
  const { mode, toggle } = useTheme(); const [confirm, setConfirm] = useState(false); const [msg, setMsg] = useState('');
  const del = async () => {
    try { await api.deleteMyData(); } catch { /* server copy may not exist */ }
    clearLocalData(); setMsg('All your data has been deleted.'); setTimeout(() => onDeleted(), 800);
  };
  return (
    <div className="space-y-6">
      <TextReveal text="Settings" className="grad-text text-4xl font-extrabold" />
      <section className="card flex items-center justify-between p-5"><div><h2 className="text-xl font-bold">Appearance</h2><p className="text-muted">Currently {mode === 'dark' ? 'Dark' : 'Bright'} mode</p></div><button className="btn-ghost" onClick={toggle}>Switch</button></section>
      <section className="card space-y-3 p-5" aria-labelledby="del-h">
        <h2 id="del-h" className="text-xl font-bold">Your data</h2>
        <p className="text-muted">We keep only a hashed phone number and PII-redacted scan history. Deleting removes server records and this device’s local data permanently.</p>
        {!confirm ? <button className="btn-ghost" onClick={() => setConfirm(true)}><Trash2 aria-hidden="true" /> Delete My Data</button> : (
          <div role="alertdialog" aria-label="Confirm deletion" className="flex flex-wrap items-center gap-3"><strong>This cannot be undone.</strong>
            <button className="btn-primary" onClick={del}>Yes, delete everything</button><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button></div>
        )}
        <p role="status" className="font-semibold">{msg}</p>
      </section>
    </div>
  );
}
