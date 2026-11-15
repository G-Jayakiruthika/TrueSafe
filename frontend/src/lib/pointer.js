// Shared normalised pointer position (-1..1) for the 3D avatar + glow cursor.
export const pointer = { x: 0, y: 0, px: 0, py: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    pointer.px = e.clientX; pointer.py = e.clientY;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
}
