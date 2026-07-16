import type { ListingInput } from './listing'

/**
 * **Mobile companion** — a phone-first, installable (PWA) viewer for a design: a
 * full-bleed hero, tappable colourway dots, a slide-up spec sheet, and the share
 * link to open it on a phone. It carries the web-app manifest + apple meta so it
 * installs to the home screen and runs full-screen. The HTML is pure + unit-tested;
 * File → Export mobile companion bakes the active design. (A native app + live sync
 * are separate infra; this is the installable companion viewer.)
 */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export interface MobileOpts {
  shareUrl?: string
}

/** A complete phone-first companion viewer as a standalone HTML string. Pure. */
export function mobileCompanionHTML(inp: ListingInput, heroDataUrl: string, opts: MobileOpts = {}): string {
  const colours = inp.colours.length ? inp.colours : [{ label: 'Default', hex: '#222222' }]
  const dots = colours
    .map((c, i) => `<button class="dot${i === 0 ? ' on' : ''}" data-v="${esc(c.label)}" style="background:${esc(c.hex)}" aria-label="${esc(c.label)}"></button>`)
    .join('')
  const sizes = (inp.sizes.length ? inp.sizes : ['One size']).map((s) => `<span class="sz">${esc(s)}</span>`).join('')
  const care = (inp.careLines ?? []).map((c) => `<li>${esc(c)}</li>`).join('')
  // an inline web-app manifest so it installs without a separate file
  const manifest = JSON.stringify({
    name: inp.name,
    short_name: inp.name.slice(0, 12),
    display: 'standalone',
    background_color: '#101014',
    theme_color: '#101014'
  })
  const share = opts.shareUrl ?? ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="theme-color" content="#101014"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<link rel="manifest" href='data:application/manifest+json,${encodeURIComponent(manifest)}'/>
<title>${esc(inp.name)}</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; height: 100%; font: 15px/1.5 -apple-system, system-ui, sans-serif; color: #fff; background: #101014; }
  .app { position: fixed; inset: 0; display: flex; flex-direction: column; }
  .hero { flex: 1; background: #17171c center/cover no-repeat; }
  .dots { display: flex; gap: 12px; justify-content: center; padding: 12px; }
  .dot { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #101014; outline: 1px solid #444; }
  .dot.on { outline: 2px solid #fff; }
  .sheet { background: #17171c; border-radius: 18px 18px 0 0; padding: 18px 20px calc(20px + env(safe-area-inset-bottom)); }
  h1 { margin: 0 0 2px; font-size: 20px; }
  .fabric { color: #9a9aa4; font-size: 13px; margin: 0 0 10px; }
  .cname { font-size: 13px; min-height: 18px; margin-bottom: 8px; }
  .sizes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .sz { border: 1px solid #3a3a42; border-radius: 8px; padding: 6px 12px; font-size: 13px; }
  .price { font-size: 22px; font-weight: 800; }
  ul { margin: 8px 0 0; padding-left: 18px; color: #9a9aa4; font-size: 12px; }
  .cta { display: block; text-align: center; margin-top: 14px; padding: 14px; border-radius: 12px; background: #fff; color: #101014; font-weight: 800; text-decoration: none; }
</style></head>
<body><div class="app">
  <div class="hero" style="background-image:url('${esc(heroDataUrl)}')"></div>
  <div class="dots" id="dots">${dots}</div>
  <div class="sheet">
    <h1>${esc(inp.name)}</h1>
    <p class="fabric">${esc(inp.fabricName)} · ${esc(inp.fibre)}</p>
    <div class="cname" id="cname">${esc(colours[0].label)}</div>
    <div class="sizes">${sizes}</div>
    <div class="price">$${inp.priceUsd.toFixed(2)}</div>
    ${care ? `<ul>${care}</ul>` : ''}
    ${share ? `<a class="cta" href="${esc(share)}">Open in the 3D studio</a>` : ''}
  </div>
</div>
<script>
  var d = document.getElementById('dots'), cn = document.getElementById('cname');
  if (d) d.addEventListener('click', function (e) {
    var b = e.target.closest('.dot'); if (!b) return;
    Array.prototype.forEach.call(d.querySelectorAll('.dot'), function (x) { x.classList.remove('on'); });
    b.classList.add('on'); cn.textContent = b.dataset.v;
  });
</script>
</body></html>`
}
