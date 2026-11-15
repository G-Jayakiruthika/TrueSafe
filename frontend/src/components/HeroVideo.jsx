import { useEffect, useRef, useState } from 'react';

/**
 * Cinematic hero: autoplaying, looping, muted HTML5 video. Drop a clip at public/hero.mp4 / hero.webm
 * and build with VITE_HERO=1 to switch it on.
 * A canvas animation of threats being blocked is rendered underneath as a poster/fallback so the hero is never empty.
 */
function ThreatCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext('2d');
    let w; let h; let raf; const items = []; const bursts = [];
    const fit = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    fit(); addEventListener('resize', fit);
    const labels = ['OTP?', 'ARREST', 'PRIZE', 'KYC', 'LOAN', 'PARCEL'];
    const css = (n) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(n)})`.replace(/\s+/g, ',').replace('rgb(,', 'rgb(');
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      if (Math.random() < 0.04) items.push({ x: Math.random() * w, y: -20, v: 1.2 + Math.random() * 1.5, t: labels[(Math.random() * labels.length) | 0] });
      const shield = h * 0.72;
      ctx.strokeStyle = css('--accent'); ctx.lineWidth = 3; ctx.shadowBlur = 18; ctx.shadowColor = css('--accent');
      ctx.beginPath(); ctx.moveTo(0, shield); ctx.quadraticCurveTo(w / 2, shield - 36, w, shield); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.font = '700 13px monospace'; ctx.textAlign = 'center';
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.y += it.v;
        ctx.fillStyle = 'rgb(255,120,100)'; ctx.fillText(`⚠ ${it.t}`, it.x, it.y);
        if (it.y > shield - 14) { for (let k = 0; k < 10; k++) bursts.push({ x: it.x, y: shield - 14, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, l: 30 }); items.splice(i, 1); }
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]; b.x += b.vx; b.y += b.vy; b.vy += 0.1; b.l--;
        ctx.fillStyle = css('--accent'); ctx.globalAlpha = Math.max(b.l / 30, 0); ctx.fillRect(b.x, b.y, 3, 3); ctx.globalAlpha = 1;
        if (b.l <= 0) bursts.splice(i, 1);
      }
    };
    loop();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

/**
 * No clip ships with the repo, so the video layer is opt-in: build with
 * VITE_HERO=1 once a file exists at public/hero.mp4. Without it the canvas is the
 * hero on its own, and the browser is never asked for a file that is not there.
 */
export default function HeroVideo() {
  const [ok, setOk] = useState(import.meta.env.VITE_HERO === '1');
  return (
    <figure className="card relative h-56 overflow-hidden sm:h-72" aria-label="Looping demo: cyber threats being blocked by TrueSafe">
      <ThreatCanvas />
      {ok && (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1}
          onError={() => setOk(false)}>
          <source src={`${import.meta.env.BASE_URL}hero.webm`} type="video/webm" onError={() => {}} />
          <source src={`${import.meta.env.BASE_URL}hero.mp4`} type="video/mp4" onError={() => setOk(false)} />
        </video>
      )}
      <figcaption className="absolute bottom-3 left-4 rounded-full bg-bg/90 px-3 py-1 text-sm font-semibold">Threats blocked in real time</figcaption>
    </figure>
  );
}
