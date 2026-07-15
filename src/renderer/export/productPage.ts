import type { ListingInput } from './listing'

/**
 * **Storefront product page** — a single self-contained HTML product page for a
 * finished design (hero image, name, price, description, clickable colourway
 * swatches + size buttons, an "Add to cart" call-to-action). A drop-in preview a
 * maker can host or hand to a developer. Pure string maths (no DOM) so it's
 * unit-tested; the studio bakes the live hero render in and saves it.
 */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** A complete storefront product page as an HTML string. `heroDataUrl` is an
 *  optional embedded product shot (a `data:` PNG). Pure. */
export function productPageHtml(inp: ListingInput, heroDataUrl?: string): string {
  const swatches = (inp.colours.length ? inp.colours : [{ label: 'Default', hex: '#222222' }])
    .map((c, i) => `<button class="sw${i === 0 ? ' on' : ''}" style="background:${esc(c.hex)}" aria-label="${esc(c.label)}" title="${esc(c.label)}"></button>`)
    .join('')
  const sizes = (inp.sizes.length ? inp.sizes : ['One size'])
    .map((s, i) => `<button class="size${i === 0 ? ' on' : ''}">${esc(s)}</button>`)
    .join('')
  const hero = heroDataUrl
    ? `<img class="hero" src="${heroDataUrl}" alt="${esc(inp.name)}"/>`
    : `<div class="hero placeholder">${esc(inp.name)}</div>`
  const care = inp.careLines?.length ? `<ul class="care">${inp.careLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(inp.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 -apple-system, system-ui, sans-serif; color: #16161a; background: #fafafa; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 32px; display: grid; gap: 40px; grid-template-columns: 1fr 1fr; }
  @media (max-width: 720px) { .wrap { grid-template-columns: 1fr; } }
  .hero { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 14px; background: #ececf0; }
  .hero.placeholder { display: grid; place-items: center; color: #9a9aa5; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  h1 { margin: 0 0 6px; font-size: 26px; }
  .price { font-size: 22px; font-weight: 700; margin: 0 0 16px; }
  .fabric { color: #6b6b76; margin: 0 0 20px; }
  .lbl { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #8a8a95; margin: 18px 0 8px; }
  .sw { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #fff; outline: 1px solid #ddd; margin-right: 8px; cursor: pointer; }
  .sw.on { outline: 2px solid #16161a; }
  .size { min-width: 44px; padding: 8px 12px; margin: 0 8px 8px 0; border: 1px solid #cfcfd6; background: #fff; border-radius: 8px; cursor: pointer; }
  .size.on { border-color: #16161a; font-weight: 700; }
  .buy { margin-top: 24px; width: 100%; padding: 14px; border: 0; border-radius: 10px; background: #16161a; color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; }
  .care { color: #6b6b76; font-size: 13px; padding-left: 18px; margin-top: 24px; }
</style></head>
<body><div class="wrap">
  <div>${hero}</div>
  <div>
    <h1>${esc(inp.name)}</h1>
    <p class="price">$${inp.priceUsd.toFixed(2)}</p>
    <p class="fabric">${esc(inp.fabricName)} · ${esc(inp.fibre)}</p>
    <p>${esc(inp.description ?? 'Made to order in your choice of colour and size.')}</p>
    <div class="lbl">Colour</div><div class="swatches">${swatches}</div>
    <div class="lbl">Size</div><div class="sizes">${sizes}</div>
    <button class="buy">Add to cart</button>
    ${care}
  </div>
</div></body></html>`
}
