import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, MapPin, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api.js';
import HeroVideo from '../components/HeroVideo.jsx';
import TextReveal from '../components/TextReveal.jsx';
import Avatar3D from '../components/Avatar3D.jsx';

export default function Radar() {
  const [items, setItems] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.radar().then((r) => setItems(r.items)).catch(() => setErr('Could not load the threat feed.')); }, []);
  return (
    <div className="space-y-8">
      <section className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <TextReveal text="Your local scam radar" className="grad-text text-4xl font-extrabold sm:text-5xl" />
          <p className="mt-3 max-w-xl text-lg text-muted">Anonymised, trending threats near you. Paste any message in Scan and we’ll tell you in seconds.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link to="/scan" className="btn-primary">Scan a message</Link><Link to="/demo" className="btn-ghost">See the 8 scam types</Link></div>
        </div>
        <Avatar3D mood="scanning" size={200} />
      </section>
      <HeroVideo />
      <section aria-labelledby="feed-h">
        <h2 id="feed-h" className="mb-4 flex items-center gap-2 text-2xl font-bold"><TrendingUp aria-hidden="true" /> Trending now</h2>
        {err && <p role="alert">{err}</p>}
        {!items && !err && <p role="status">Loading…</p>}
        <ol className="space-y-4">
          {items?.map((it, i) => (
            <motion.li key={it.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="card relative overflow-hidden border-l-8 border-l-[#b8412a] p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-onaccent"><ShieldAlert size={16} aria-hidden="true" />{it.type}</span>
                <span className="inline-flex items-center gap-1 text-muted"><MapPin size={16} aria-hidden="true" />{it.area}</span>
                <span className="ml-auto text-muted">{it.hits} reports</span>
              </div>
              <p className="mt-3 text-lg">{it.text}</p>
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  );
}
