import type { ListingInput } from './listing'

/**
 * **Virtual try-on widget** — a compact, self-contained product viewer a shop can
 * drop into a product page via one `<iframe>`. It shows the hero render + tappable
 * colourway swatches (updating the shown colour name) and a **"View on you"** button
 * that opens the design in AR (the exported USDZ via iOS Quick Look, or the share
 * link as a 3D fallback). The widget HTML + the embed snippet are pure + unit-tested.
 * (A true networked AR try-on needs a hosted model + a phone camera pipeline; this is
 * the embeddable widget + the AR hand-off slice — the USDZ export already renders in
 * Quick Look.)
 */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export interface TryOnOpts {
  /** A URL to a USDZ/GLB the "View on you" button hands to AR Quick Look. */
  arUrl?: string
  /** The design's share link — the 3D fallback when there's no AR model. */
  shareUrl?: string
}

/** A complete, embeddable try-on widget as a standalone HTML string. Pure. */
export function tryOnWidgetHtml(inp: ListingInput, heroDataUrl: string, opts: TryOnOpts = {}): string {
  const colours = inp.colours.length ? inp.colours : [{ label: 'Default', hex: '#222222' }]
  const swatches = colours
    .map((c, i) => `<button class="sw${i === 0 ? ' on' : ''}" data-v="${esc(c.label)}" style="background:${esc(c.hex)}" title="${esc(c.label)}" aria-label="${esc(c.label)}"></button>`)
    .join('')
  // AR link if we have a model, else the 3D share link, else nothing actionable.
  const ar = opts.arUrl ?? ''
  const share = opts.shareUrl ?? ''
  const ctaHref = ar || share
  const ctaLabel = ar ? 'View on you (AR)' : 'View in 3D'
  const rel = ar ? ' rel="ar"' : ''
  const cta = ctaHref
    ? `<a class="cta" id="cta" href="${esc(ctaHref)}"${rel} target="_blank">${ctaLabel}</a>`
    : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(inp.name)} — try on</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, system-ui, sans-serif; color: #16161a; background: #fff; }
  .widget { width: 340px; max-width: 100%; margin: 0 auto; border: 1px solid #ececf0; border-radius: 14px; overflow: hidden; }
  .hero { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; background: #f3f3f5; }
  .body { padding: 14px 16px 16px; }
  h1 { margin: 0 0 2px; font-size: 17px; }
  .fabric { color: #7a7a84; font-size: 12px; margin: 0 0 10px; }
  .swatches { display: flex; gap: 8px; margin: 0 0 4px; }
  .sw { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; outline: 1px solid #ddd; cursor: pointer; padding: 0; }
  .sw.on { outline: 2px solid #16161a; }
  .cname { font-size: 12px; color: #16161a; min-height: 16px; margin: 6px 0 12px; }
  .price { font-size: 18px; font-weight: 800; margin: 0 0 12px; }
  .cta { display: block; text-align: center; padding: 12px; border-radius: 10px; background: #16161a; color: #fff; font-weight: 700; text-decoration: none; }
</style></head>
<body><div class="widget">
  <img class="hero" src="${esc(heroDataUrl)}" alt="${esc(inp.name)}"/>
  <div class="body">
    <h1>${esc(inp.name)}</h1>
    <p class="fabric">${esc(inp.fabricName)} · ${esc(inp.fibre)}</p>
    <div class="swatches" id="sw">${swatches}</div>
    <div class="cname" id="cname">${esc(colours[0].label)}</div>
    <p class="price">$${inp.priceUsd.toFixed(2)}</p>
    ${cta}
  </div>
  <script>
    var sw = document.getElementById('sw'), cn = document.getElementById('cname');
    if (sw) sw.addEventListener('click', function (e) {
      var b = e.target.closest('.sw'); if (!b) return;
      Array.prototype.forEach.call(sw.querySelectorAll('.sw'), function (x) { x.classList.remove('on'); });
      b.classList.add('on'); cn.textContent = b.dataset.v;
    });
  </script>
</div></body></html>`
}

export interface EmbedOpts {
  width?: number
  height?: number
}

/** The `<iframe>` snippet a shop pastes to embed a hosted widget. Pure. */
export function tryOnEmbedSnippet(widgetUrl: string, opts: EmbedOpts = {}): string {
  const w = opts.width ?? 340
  const h = opts.height ?? 560
  return `<iframe src="${esc(widgetUrl)}" width="${w}" height="${h}" style="border:0;max-width:100%" loading="lazy" title="Virtual try-on"></iframe>`
}
