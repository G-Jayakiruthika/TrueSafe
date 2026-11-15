import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function GlowCursor() {
  const x = useMotionValue(-100); const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 400, damping: 30 }); const sy = useSpring(y, { stiffness: 400, damping: 30 });
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return undefined;
    document.body.classList.add('custom-cursor');
    const mv = (e) => { x.set(e.clientX - 14); y.set(e.clientY - 14); };
    addEventListener('pointermove', mv, { passive: true });
    return () => { removeEventListener('pointermove', mv); document.body.classList.remove('custom-cursor'); };
  }, [x, y]);
  return (
    <motion.div aria-hidden="true" style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-7 w-7 rounded-full border-2 border-accent bg-accent/30 shadow-[0_0_30px_6px_rgb(var(--accent)/0.6)] [@media(pointer:fine)]:block" />
  );
}
