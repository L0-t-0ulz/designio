import type { ListingInput } from './listing'

/**
 * **Made-to-order configurator** — a self-contained HTML page where a customer picks
 * a colour + size, sees a live price (base + any size upcharge), and fires a
 * made-to-order request (a `mailto:` pre-filled with their selection + the design's
 * share link). The page is standalone (inline JS, no build step). The HTML + the pure
 * `sizeUpcharge` price maths are unit-tested; the studio bakes in the share link.
 */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Size upcharge (USD) — plus sizes cost a little more cloth. Pure, unit-tested. */
export function sizeUpcharge(size: string): number {
  const map: Record<string, number> = { XL: 8, XXL: 14, '2XL': 14, '3XL': 20 }
  return map[size.toUpperCase()] ?? 0
}

export interface ConfiguratorOpts {
  /** Where the "Request made to order" mail is sent. */
  email?: string
  /** The design's share link (travels in the order so the maker gets the exact spec). */
  shareUrl?: string
}

/** A complete made-to-order configurator page as an HTML string. Pure. */
export function configuratorHtml(inp: ListingInput, opts: ConfiguratorOpts = {}): string {
  const colours = inp.colours.length ? inp.colours : [{ label: 'Default', hex: '#222222' }]
  const sizes = inp.sizes.length ? inp.sizes : ['One size']
  const email = opts.email ?? 'orders@example.com'
  const swatches = colours
    .map((c, i) => `<button class="opt sw${i === 0 ? ' on' : ''}" data-v="${esc(c.label)}" style="background:${esc(c.hex)}" title="${esc(c.label)}"></button>`)
    .join('')
  const sizeBtns = sizes
    .map((s, i) => `<button class="opt size${i === 0 ? ' on' : ''}" data-v="${esc(s)}" data-up="${sizeUpcharge(s)}">${esc(s)}</button>`)
    .join('')
  const data = {
    name: inp.name,
    base: inp.priceUsd,
    email,
    share: opts.shareUrl ?? ''
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(inp.name)} — made to order</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 -apple-system, system-ui, sans-serif; color: #16161a; background: #fafafa; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 40px 28px; }
  h1 { margin: 0 0 4px; font-size: 26px; }
  .fabric { color: #6b6b76; margin: 0 0 18px; }
  .lbl { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #8a8a95; margin: 20px 0 8px; }
  .opt { cursor: pointer; }
  .sw { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #fff; outline: 1px solid #ddd; margin-right: 8px; }
  .sw.on { outline: 2px solid #16161a; }
  .size { min-width: 46px; padding: 9px 12px; margin: 0 8px 8px 0; border: 1px solid #cfcfd6; background: #fff; border-radius: 8px; }
  .size.on { border-color: #16161a; font-weight: 700; }
  .price { font-size: 26px; font-weight: 800; margin: 22px 0 4px; }
  .price small { font-size: 13px; font-weight: 500; color: #8a8a95; }
  .cta { display: inline-block; margin-top: 14px; padding: 14px 22px; border-radius: 10px; background: #16161a; color: #fff; font-weight: 700; text-decoration: none; }
</style></head>
<body><div class="wrap">
  <h1>${esc(inp.name)}</h1>
  <p class="fabric">${esc(inp.fabricName)} · ${esc(inp.fibre)} · made to order</p>
  <div class="lbl">Colour</div><div id="colours">${swatches}</div>
  <div class="lbl">Size</div><div id="sizes">${sizeBtns}</div>
  <p class="price">$<span id="total">${inp.priceUsd.toFixed(2)}</span> <small id="up"></small></p>
  <a class="cta" id="cta" href="#">Request made to order</a>
  <script>
    const D = ${JSON.stringify(data)};
    let colour = ${JSON.stringify(colours[0].label)}, size = ${JSON.stringify(sizes[0])}, up = ${sizeUpcharge(sizes[0])};
    function pick(group, btn) {
      group.querySelectorAll('.opt').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
    }
    document.getElementById('colours').addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b) return; pick(e.currentTarget, b); colour = b.dataset.v; render();
    });
    document.getElementById('sizes').addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b) return; pick(e.currentTarget, b); size = b.dataset.v; up = +b.dataset.up; render();
    });
    function render() {
      document.getElementById('total').textContent = (D.base + up).toFixed(2);
      document.getElementById('up').textContent = up ? '(incl. $' + up.toFixed(2) + ' size)' : '';
      const body = 'Made-to-order request:%0D%0A' + D.name + '%0D%0AColour: ' + colour + '%0D%0ASize: ' + size + '%0D%0APrice: $' + (D.base + up).toFixed(2) + (D.share ? '%0D%0ADesign: ' + encodeURIComponent(D.share) : '');
      document.getElementById('cta').href = 'mailto:' + D.email + '?subject=' + encodeURIComponent('Made to order: ' + D.name) + '&body=' + body;
    }
    render();
  </script>
</div></body></html>`
}
