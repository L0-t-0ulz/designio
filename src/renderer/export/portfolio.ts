/**
 * **Public portfolio page** — a single self-contained HTML gallery of a designer's
 * saved projects (thumbnail grid + names), a shareable "brand book" a maker can host.
 * Pure string maths (no DOM) so it's unit-tested; the studio feeds it the saved
 * project list + thumbnails and saves the HTML.
 */
export interface PortfolioItem {
  name: string
  /** A `data:` PNG thumbnail, if the project has one. */
  thumb?: string
  /** Epoch ms (for a subtitle date); 0/undefined hides it. */
  updatedAt?: number
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** A month-year label from epoch ms, or '' if absent. Pure (fixed locale). */
export function portfolioDate(ms?: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** The full portfolio page as an HTML string. Pure. */
export function portfolioHtml(brand: string, items: PortfolioItem[]): string {
  const cards = items.length
    ? items
        .map((it) => {
          const media = it.thumb
            ? `<img src="${it.thumb}" alt="${esc(it.name)}"/>`
            : `<div class="ph">${esc(it.name)}</div>`
          const date = portfolioDate(it.updatedAt)
          return `<figure class="card">${media}<figcaption><span class="nm">${esc(it.name)}</span>${date ? `<span class="dt">${esc(date)}</span>` : ''}</figcaption></figure>`
        })
        .join('')
    : `<p class="empty">No designs yet — save a project to fill your portfolio.</p>`
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(brand)} — Portfolio</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 -apple-system, system-ui, sans-serif; color: #16161a; background: #fff; }
  header { padding: 56px 32px 24px; text-align: center; }
  header h1 { margin: 0; font-size: 30px; letter-spacing: .02em; }
  header p { margin: 6px 0 0; color: #8a8a95; text-transform: uppercase; letter-spacing: .16em; font-size: 12px; }
  .grid { max-width: 1100px; margin: 0 auto; padding: 24px 32px 64px; display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  .card { margin: 0; }
  .card img, .card .ph { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 12px; background: #eee; display: block; }
  .card .ph { display: grid; place-items: center; color: #9a9aa5; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; font-size: 12px; text-align: center; padding: 12px; }
  figcaption { display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; }
  .nm { font-weight: 600; }
  .dt { color: #9a9aa5; font-size: 12px; }
  .empty { text-align: center; color: #8a8a95; padding: 60px; }
</style></head>
<body>
  <header><h1>${esc(brand)}</h1><p>Portfolio</p></header>
  <div class="grid">${cards}</div>
</body></html>`
}
