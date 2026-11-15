import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import TextReveal from '../components/TextReveal.jsx';

export default function MyFamily() {
  const [list, setList] = useState(() => { try { return JSON.parse(localStorage.getItem('ts_family')) || []; } catch { return []; } });
  const [name, setName] = useState(''); const [rel, setRel] = useState('Parent');
  const save = (l) => { setList(l); localStorage.setItem('ts_family', JSON.stringify(l)); };
  const add = (e) => { e.preventDefault(); const n = name.trim().slice(0, 80); if (!n) return; save([...list, { id: crypto.randomUUID(), name: n, rel }]); setName(''); };
  return (
    <div className="space-y-6">
      <TextReveal text="My Family" className="grad-text text-4xl font-extrabold" />
      <p className="text-muted">Link family members whose feature-phone reports you help with. Stored only on this device.</p>
      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="grow"><label htmlFor="fn" className="mb-1 block font-semibold">Name</label><input id="fn" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-12 w-full rounded-xl border-2 border-fg/50 bg-transparent px-3" /></div>
        <div><label htmlFor="fr" className="mb-1 block font-semibold">Relation</label>
          <select id="fr" value={rel} onChange={(e) => setRel(e.target.value)} className="h-12 rounded-xl border-2 border-fg/50 bg-bg px-3"><option>Parent</option><option>Grandparent</option><option>Sibling</option><option>Neighbour</option></select></div>
        <button className="btn-primary"><UserPlus aria-hidden="true" />Add</button>
      </form>
      <ul className="space-y-3">
        {list.map((m) => (
          <li key={m.id} className="card flex items-center gap-3 p-4"><span className="grow text-lg font-semibold">{m.name} <span className="font-normal text-muted">· {m.rel}</span></span>
            <button className="btn-ghost !min-h-[44px]" aria-label={`Remove ${m.name}`} onClick={() => save(list.filter((x) => x.id !== m.id))}><Trash2 size={18} /></button></li>
        ))}
        {!list.length && <li className="text-muted">No one linked yet.</li>}
      </ul>
    </div>
  );
}
