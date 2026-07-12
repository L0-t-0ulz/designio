/**
 * **360° product viewer** — a single self-contained HTML file with the garment
 * pre-rendered at N angles (sprite frames): drag / swipe / arrow-keys to spin,
 * autoplays gently until first touch. Works anywhere a browser opens a file —
 * no server, no dependencies — so a designer can send one file to a client and
 * they can spin the piece. The document builder is pure + unit-tested; `main`
 * captures the frames via `turntablePose` + `renderStill`.
 */

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The standalone viewer document. `frames` are same-size data-URL stills, one full turn. */
export function viewer360HTML(title: string, frames: string[]): string {
  if (frames.length < 2) throw new Error('a 360° viewer needs at least 2 frames')
  const t = esc(title)
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t} — 360° view</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101014; color: #c9cbd4;
         font: 14px system-ui, sans-serif; user-select: none; }
  main { text-align: center; }
  img { max-width: 92vw; max-height: 82vh; cursor: grab; touch-action: none; border-radius: 8px; }
  img.dragging { cursor: grabbing; }
  p { opacity: 0.65; margin: 12px 0 0; }
</style>
<main>
  <img id="v" draggable="false" alt="${t} — rotatable 360° view">
  <p>${t} · drag or ← → to spin</p>
</main>
<script>
  const FRAMES = ${JSON.stringify(frames)};
  const img = document.getElementById('v');
  let i = 0, auto = true;
  const show = (k) => { i = ((k % FRAMES.length) + FRAMES.length) % FRAMES.length; img.src = FRAMES[i]; };
  show(0);
  setInterval(() => { if (auto) show(i + 1); }, 120); // gentle autoplay until first touch
  let dragX = null, dragI = 0;
  img.addEventListener('pointerdown', (e) => { auto = false; dragX = e.clientX; dragI = i; img.classList.add('dragging'); img.setPointerCapture(e.pointerId); });
  img.addEventListener('pointermove', (e) => { if (dragX === null) return; show(dragI + Math.round((e.clientX - dragX) / 12)); });
  img.addEventListener('pointerup', () => { dragX = null; img.classList.remove('dragging'); });
  addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { auto = false; show(i - 1); } if (e.key === 'ArrowRight') { auto = false; show(i + 1); } });
</script>
</html>
`
}
