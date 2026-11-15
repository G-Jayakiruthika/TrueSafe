import { useState } from 'react';
import { MessageCircle, Send, Instagram, Briefcase } from 'lucide-react';
import TextReveal from '../components/TextReveal.jsx';

const APPS = [
  { id: 'wa', name: 'WhatsApp', icon: MessageCircle }, { id: 'tg', name: 'Telegram', icon: Send },
  { id: 'ig', name: 'Instagram', icon: Instagram }, { id: 'wab', name: 'WhatsApp Business', icon: Briefcase },
];

/** Mock integration toggles (no real account access is requested or granted). */
export default function Apps() {
  const [on, setOn] = useState(() => { try { return JSON.parse(localStorage.getItem('ts_apps')) || {}; } catch { return {}; } });
  const flip = (id) => { const n = { ...on, [id]: !on[id] }; setOn(n); localStorage.setItem('ts_apps', JSON.stringify(n)); };
  return (
    <div className="space-y-6">
      <TextReveal text="Connected Apps" className="grad-text text-4xl font-extrabold" />
      <p className="text-muted">Demo only: toggles show how TrueSafe would auto-fetch chats for scanning. No account is actually connected.</p>
      <ul className="space-y-3">
        {APPS.map(({ id, name, icon: I }) => (
          <li key={id} className="card flex items-center gap-4 p-4">
            <I aria-hidden="true" className="text-accent" size={28} />
            <div className="grow"><p id={`l-${id}`} className="text-lg font-bold">{name}</p><p className="text-muted">{on[id] ? 'Auto-scan enabled (mock)' : 'Not connected'}</p></div>
            <button role="switch" aria-checked={!!on[id]} aria-labelledby={`l-${id}`} onClick={() => flip(id)}
              className={`relative h-9 w-16 rounded-full border-2 border-fg/60 transition ${on[id] ? 'bg-accent' : 'bg-bg'}`}>
              <span className={`absolute top-0.5 h-7 w-7 rounded-full transition-all ${on[id] ? 'left-[30px] bg-onaccent' : 'left-0.5 bg-fg'}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
