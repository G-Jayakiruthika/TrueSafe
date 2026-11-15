import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck, Landmark } from 'lucide-react';
import { getHistory } from '../lib/history.js';

const ICON = { SCAM: ShieldAlert, SAFE: ShieldCheck, CIVIC_ISSUE: Landmark };
const TONE = { SCAM: 'from-[#8c1d2c] to-[#1a0405] text-[#fff4e0]', SAFE: 'from-[#0f766e] to-[#3b0764] text-white', CIVIC_ISSUE: 'from-[#a94f2d] to-[#3a1a10] text-[#fff4e8]' };

/** Aceternity "Apple Cards Carousel" style: snap-scrolling cards with prev/next controls. */
export function AppleCarousel({ items, onPick }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 300, behavior: 'smooth' });
  if (!items.length) return <p className="px-6 text-muted">No scans yet. Your recent scans will appear here.</p>;
  return (
    <div className="relative">
      <div ref={ref} className="flex snap-x gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none]" role="list" aria-label="Recent scans">
        {items.map((it, i) => {
          const Icon = ICON[it.classification] || ShieldCheck;
          return (
            <motion.button key={i} role="listitem" onClick={() => onPick?.(it)}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className={`relative h-64 w-56 shrink-0 snap-start overflow-hidden rounded-3xl bg-gradient-to-b p-5 text-left ${TONE[it.classification] || TONE.SAFE}`}>
              <Icon aria-hidden="true" className="mb-2" />
              <span className="text-sm font-semibold uppercase tracking-wider">{it.classification?.replace('_', ' ')}</span>
              <p className="mt-2 line-clamp-6 text-lg font-bold leading-snug">{it.text}</p>
              <span className="absolute bottom-4 left-5 text-sm">{new Date(it.at).toLocaleDateString()}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="mr-6 flex justify-end gap-2">
        <button className="btn-ghost !min-h-[44px] !px-3" aria-label="Scroll recent scans left" onClick={() => scroll(-1)}><ChevronLeft /></button>
        <button className="btn-ghost !min-h-[44px] !px-3" aria-label="Scroll recent scans right" onClick={() => scroll(1)}><ChevronRight /></button>
      </div>
    </div>
  );
}

/** Full-screen blurred search overlay opened with Cmd/Ctrl+K. */
export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState(''); const [hist, setHist] = useState(getHistory());
  const input = useRef(null);
  useEffect(() => {
    const upd = () => setHist(getHistory());
    addEventListener('ts-history', upd); return () => removeEventListener('ts-history', upd);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    setHist(getHistory()); setQ(''); setTimeout(() => input.current?.focus(), 50);
    const esc = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc); return () => removeEventListener('keydown', esc);
  }, [open, onClose]);
  const shown = hist.filter((h) => h.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-modal="true" aria-label="Search scan history" className="fixed inset-0 z-[80] flex flex-col bg-bg/70 backdrop-blur-3xl"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute right-4 top-4 btn-ghost" onClick={onClose} aria-label="Close search">Esc</button>
          <div className="mx-auto mt-[22vh] w-full max-w-3xl px-6">
            <label htmlFor="global-search" className="sr-only">Search recent scans</label>
            <input id="global-search" ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recent scans…" autoComplete="off"
              className="w-full border-b-2 border-fg/50 bg-transparent pb-3 text-4xl font-bold outline-none placeholder:text-muted focus:border-accent sm:text-6xl" />
          </div>
          <div className="mt-auto pb-10">
            <h2 className="mb-4 px-6 text-xl font-bold">Recent scans</h2>
            <AppleCarousel items={shown} onPick={(it) => setQ(it.text.slice(0, 40))} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
