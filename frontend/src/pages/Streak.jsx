import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Check, X, Flame } from 'lucide-react';
import { useTheme } from '../lib/theme.jsx';
import TextReveal from '../components/TextReveal.jsx';

const DECK = [
  { t: 'SBI: Your KYC expires today. Update at http://sbi-kyc-update.in or account will be blocked.', scam: true, clue: 'Urgency + a look-alike link. Banks never ask you to update KYC via SMS links.' },
  { t: 'Your OTP for Swiggy order is 482913. Do not share it with anyone.', scam: false, clue: 'You triggered this OTP yourself, and it warns you not to share it.' },
  { t: 'This is CBI. A parcel in your name has drugs. Stay on video call – you are under digital arrest.', scam: true, clue: 'No agency arrests anyone on video call. Authority + fear is the classic trick.' },
  { t: 'Amma, this is a new number. I lost my phone. Please send ₹15,000 urgently, I will explain later.', scam: true, clue: 'Voice/identity impersonation. Call the old number or ask a family-only question.' },
  { t: 'Your electricity bill of ₹1,240 is due on 20 Nov. Pay on the official TNEB app or counter.', scam: false, clue: 'Routine reminder with no link, threat, or demand to share secrets.' },
  { t: 'Congratulations! You won ₹25 lakh in the Lucky Draw. Pay ₹4,999 processing fee to claim.', scam: true, clue: 'Real prizes never charge fees. Greed + upfront payment.' },
  { t: 'Earn ₹5,000/day by liking YouTube videos. Join our Telegram task group.', scam: true, clue: 'Task jobs pay small amounts first, then demand “deposits”.' },
  { t: 'Hi, your Amazon package will arrive tomorrow between 2-6 PM. Track in the Amazon app.', scam: false, clue: 'No link or payment; directs you to the official app.' },
];

export default function Streak() {
  const { setState } = useTheme();
  const [i, setI] = useState(0); const [streak, setStreak] = useState(() => Number(localStorage.getItem('ts_streak')) || 0);
  const [fb, setFb] = useState(null); const [score, setScore] = useState(0);
  const x = useMotionValue(0); const rot = useTransform(x, [-200, 200], [-14, 14]);
  const safeOp = useTransform(x, [0, 120], [0, 1]); const scamOp = useTransform(x, [-120, 0], [1, 0]);
  const busy = useRef(false);
  useEffect(() => { setState('safe'); return () => setState('neutral'); }, [setState]);

  const answer = (saysScam) => {
    if (busy.current || fb) return; busy.current = true;
    const card = DECK[i]; const right = saysScam === card.scam;
    const ns = right ? streak + 1 : 0; setStreak(ns); localStorage.setItem('ts_streak', String(ns));
    if (right) setScore((s) => s + 1);
    setFb({ right, clue: card.clue, scam: card.scam });
    animate(x, saysScam ? -500 : 500, { duration: 0.3 }).then(() => { busy.current = false; });
  };
  const next = () => { setFb(null); x.set(0); setI((n) => n + 1); };
  const done = i >= DECK.length;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <TextReveal text="Safe or scam?" className="grad-text text-center text-4xl font-extrabold" />
      <p className="flex items-center justify-center gap-2 text-xl font-bold" aria-live="polite"><Flame className="text-accent" aria-hidden="true" /> Streak: {streak}</p>
      {done ? (
        <div className="card p-8 text-center"><h2 className="text-3xl font-extrabold">Round complete!</h2><p className="mt-2 text-xl">You got {score} of {DECK.length} right.</p>
          <button className="btn-primary mt-5" onClick={() => { setI(0); setScore(0); x.set(0); }}>Play again</button></div>
      ) : (
        <>
          <p className="text-center text-muted">Swipe left for SCAM, right for SAFE — or use the buttons.</p>
          <div className="relative h-72">
            <motion.div key={i} drag={fb ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} style={{ x, rotate: rot }}
              onDragEnd={(_, info) => { if (info.offset.x > 100) answer(false); else if (info.offset.x < -100) answer(true); }}
              className="card absolute inset-0 flex cursor-grab flex-col justify-center p-6 text-xl font-medium shadow-xl active:cursor-grabbing" aria-label={`Message ${i + 1} of ${DECK.length}`}>
              <motion.span style={{ opacity: safeOp }} className="absolute right-4 top-4 rounded-lg border-2 border-accent px-3 py-1 text-lg font-extrabold text-accent">SAFE</motion.span>
              <motion.span style={{ opacity: scamOp }} className="absolute left-4 top-4 rounded-lg border-2 border-accent px-3 py-1 text-lg font-extrabold text-accent">SCAM</motion.span>
              {DECK[i].t}
            </motion.div>
          </div>
          {fb ? (
            <div role="status" className="card space-y-2 p-5">
              <p className="text-xl font-extrabold">{fb.right ? '✅ Correct!' : '❌ Not quite.'} It was {fb.scam ? 'a SCAM' : 'SAFE'}.</p>
              <p className="text-lg">{fb.clue}</p>
              <button className="btn-primary w-full" onClick={next} autoFocus>Next message</button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => answer(true)}><X aria-hidden="true" /> Scam</button>
              <button className="btn-primary flex-1" onClick={() => answer(false)}><Check aria-hidden="true" /> Safe</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
