import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TextReveal from '../components/TextReveal.jsx';

gsap.registerPlugin(ScrollTrigger);

const TYPES = [
  { n: 'Fake investment', d: 'Fraudsters promise 10x returns via “insider” crypto or stock groups, show fake profit dashboards, then block withdrawals.', msg: 'Join our VIP group: invest ₹10,000, get ₹1 lakh in 7 days. 100% guaranteed!', tip: 'Guaranteed returns do not exist.' },
  { n: 'Digital arrest', d: 'Callers pose as CBI/police, claim you are linked to a crime, and keep you on video call demanding “bail” money.', msg: 'You are under DIGITAL ARREST. Do not disconnect this call. Transfer ₹2,00,000 to the RBI safe account.', tip: 'There is no such thing as digital arrest. Hang up, call 1930.' },
  { n: 'KYC / OTP', d: 'Fake bank messages push you to “update KYC” and then ask for the OTP that drains your account.', msg: 'Dear customer your KYC is pending. Click bit.ly/kyc-now and enter OTP.', tip: 'Never share an OTP — not even with the bank.' },
  { n: 'Courier parcel', d: 'A “courier” says your parcel has illegal items or needs a fee, then transfers you to fake officials.', msg: 'FedEx: Parcel held at customs. Pay ₹3,450 clearance via UPI to release.', tip: 'Check tracking on the official app only.' },
  { n: 'Task job', d: 'Pay-per-like tasks pay tiny sums first, then require larger “deposits” to unlock bigger earnings.', msg: 'Earn ₹3,000/day. Like videos, then deposit ₹5,000 to unlock premium tasks.', tip: 'Real jobs never ask you to pay to work.' },
  { n: 'Lottery / bill', d: 'Fake prize winnings and urgent “electricity disconnection” notices create greed or fear.', msg: 'Your power will be cut tonight 9:30 PM. Call 98xxxxxx immediately to pay pending bill.', tip: 'Verify bills in your official utility app.' },
  { n: 'Voice clone', d: 'AI clones a relative’s voice from social media clips and pleads for urgent money.', msg: '“Papa, I’ve had an accident. Please send ₹40,000 right now, don’t tell mom.”', tip: 'Agree on a family safe-word and call back on the saved number.' },
  { n: 'Loan / sextortion', d: 'Predatory loan apps steal contacts and harass; sextortion callers threaten to leak private videos.', msg: 'Pay back now or we will send your photos to all your contacts.', tip: 'Do not pay. Screenshot, block, report on 1930.' },
];

/** Aceternity-style Sticky Scroll Reveal: text scrolls left, sticky phone frame (right) updates and is animated with GSAP. */
export default function Demo() {
  const [active, setActive] = useState(0);
  const refs = useRef([]); const phone = useRef(null);

  useEffect(() => {
    const triggers = refs.current.map((el, i) => ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setActive(i) }));
    return () => triggers.forEach((t) => t.kill());
  }, []);
  useEffect(() => {
    if (!phone.current) return;
    gsap.fromTo(phone.current.querySelectorAll('[data-pop]'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: 'power3.out' });
  }, [active]);

  const t = TYPES[active];
  return (
    <div>
      <TextReveal text="8 scams, decoded" className="grad-text text-4xl font-extrabold sm:text-5xl" />
      <p className="mt-2 max-w-xl text-lg text-muted">Scroll to see what each scam looks like on a victim’s phone.</p>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <ol>
          {TYPES.map((s, i) => (
            <li key={s.n} ref={(el) => (refs.current[i] = el)} className={`flex min-h-[70vh] flex-col justify-center transition-opacity ${active === i ? 'opacity-100' : 'opacity-40'}`}>
              <span className="font-bold text-accent">0{i + 1} / 08</span>
              <h2 className="mt-1 text-4xl font-extrabold">{s.n}</h2>
              <p className="mt-3 max-w-md text-xl">{s.d}</p>
              <p className="mt-4 max-w-md text-lg font-semibold md:hidden">💡 {s.tip}</p>
            </li>
          ))}
        </ol>
        <div className="hidden md:block">
          <div ref={phone} className="sticky top-24 mx-auto h-[600px] w-[300px] rounded-[44px] border-[10px] border-fg/80 bg-bg p-4 shadow-2xl" role="img" aria-label={`Phone showing a ${t.n} scam message. Tip: ${t.tip}`}>
            <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-fg/80" />
            <p data-pop className="text-sm font-semibold text-muted">Unknown sender · now</p>
            <div data-pop className="mt-2 rounded-2xl rounded-tl-sm bg-a2/30 p-4 text-lg font-medium">{t.msg}</div>
            <div data-pop className="mt-6 rounded-2xl border-2 border-accent p-4">
              <p className="text-sm font-extrabold uppercase text-accent">TrueSafe verdict</p>
              <p className="mt-1 text-xl font-extrabold">⚠ SCAM · {t.n}</p>
              <p className="mt-2">{t.tip}</p>
            </div>
            <p data-pop className="mt-6 text-center text-sm text-muted">Report on 1930 · cybercrime.gov.in</p>
          </div>
        </div>
      </div>
    </div>
  );
}
