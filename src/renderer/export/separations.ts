import type { Print } from '../start/design'

/**
 * **Layered print with registration** — colour-separation sheets for screen
 * printing. Each print becomes its own screen (one colour), and every screen for
 * the same garment part carries the **same registration crosshairs** at three fixed
 * points, so a printer burns aligned screens and lays each colour down in register.
 * Prints on different parts (body / sleeves / legs) print on different panels, so
 * each part gets its own registered set. The registration geometry + the HTML are
 * pure + unit-tested; File → Export exports the sheet for the active design's prints.
 */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const hex = (c: number): string => '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6)

/** The print area a screen is registered within (arbitrary SVG units — a portrait sheet). */
export const SHEET_W = 400
export const SHEET_H = 520

export interface RegMark {
  x: number
  y: number
}

/**
 * The three registration targets (top-left, top-right, bottom-centre) — the classic
 * 3-point garment registration. Shared across every screen so the colours align. Pure.
 */
export function registrationMarks(w: number = SHEET_W, h: number = SHEET_H, inset = 24): RegMark[] {
  return [
    { x: inset, y: inset },
    { x: w - inset, y: inset },
    { x: w / 2, y: h - inset }
  ]
}

/** Group prints by the garment part they print on (each part = its own registered set). */
export function separationsByPart(prints: Print[]): { part: string; prints: Print[] }[] {
  const order = ['body', 'sleeves', 'legs']
  const groups = new Map<string, Print[]>()
  for (const p of prints) {
    const arr = groups.get(p.part) ?? []
    arr.push(p)
    groups.set(p.part, arr)
  }
  return [...groups.keys()]
    .sort((a, b) => (order.indexOf(a) + 99) % 100 - ((order.indexOf(b) + 99) % 100))
    .map((part) => ({ part, prints: groups.get(part)! }))
}

const label = (p: Print): string => (p.kind === 'text' ? `“${p.text}”` : p.imageName || 'image')

/** One registration target as SVG (a ringed crosshair). */
function markSVG(m: RegMark): string {
  const r = 9
  return `<g stroke="#000" stroke-width="1" fill="none">
    <circle cx="${m.x}" cy="${m.y}" r="${r}"/>
    <line x1="${m.x - r - 5}" y1="${m.y}" x2="${m.x + r + 5}" y2="${m.y}"/>
    <line x1="${m.x}" y1="${m.y - r - 5}" x2="${m.x}" y2="${m.y + r + 5}"/>
  </g>`
}

/** One screen: the registration marks + this print placed by its x/y/scale/rotation. */
function screenSVG(p: Print, marks: RegMark[]): string {
  const cx = p.x * SHEET_W
  const cy = p.y * SHEET_H
  const size = Math.max(24, p.scale * SHEET_W)
  const c = hex(p.color)
  const art =
    p.kind === 'text'
      ? `<text x="${cx}" y="${cy}" transform="rotate(${p.rotation} ${cx} ${cy})" fill="${c}" font-size="${Math.max(12, p.scale * 120)}" font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="central">${esc(p.text)}</text>`
      : `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" transform="rotate(${p.rotation} ${cx} ${cy})" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="5 4"/>`
  return `<svg viewBox="0 0 ${SHEET_W} ${SHEET_H}" width="${SHEET_W}" height="${SHEET_H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="${SHEET_W - 1}" height="${SHEET_H - 1}" fill="#fff" stroke="#e5e5ea"/>
    ${marks.map(markSVG).join('')}
    ${art}
  </svg>`
}

/** A complete print-separations sheet (one page per screen, per part) as HTML. Pure. */
export function separationsHTML(prints: Print[], designName = 'Design'): string {
  const marks = registrationMarks()
  const groups = separationsByPart(prints)
  const body = groups.length
    ? groups
        .map(
          (g) => `<section>
      <h2>${esc(g.part)} — ${g.prints.length} screen${g.prints.length === 1 ? '' : 's'}</h2>
      <div class="screens">${g.prints
        .map(
          (p, i) => `<figure>
          <figcaption>Screen ${i + 1} · <span class="chip" style="background:${hex(p.color)}"></span> ${hex(p.color)} · ${esc(label(p))}</figcaption>
          ${screenSVG(p, marks)}
        </figure>`
        )
        .join('')}</div>
    </section>`
        )
        .join('')
    : '<p class="empty">This design has no prints to separate. Add a graphic or text print first.</p>'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(designName)} — print separations</title>
<style>
  body { margin: 0; font: 14px/1.5 -apple-system, system-ui, sans-serif; color: #16161a; background: #f5f5f7; }
  header { padding: 22px 28px; }
  h1 { margin: 0; font-size: 20px; }
  .hint { color: #7a7a84; margin: 4px 0 0; }
  section { padding: 8px 28px 22px; }
  h2 { text-transform: capitalize; font-size: 15px; }
  .screens { display: flex; flex-wrap: wrap; gap: 20px; }
  figure { margin: 0; background: #fff; padding: 10px; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  figcaption { font-size: 12px; margin: 0 0 8px; }
  .chip { display: inline-block; width: 11px; height: 11px; border-radius: 3px; vertical-align: middle; outline: 1px solid rgba(0,0,0,.2); }
  .empty { padding: 0 28px 28px; color: #7a7a84; }
  @media print { body { background: #fff; } figure { break-inside: avoid; box-shadow: none; } }
</style></head>
<body>
  <header>
    <h1>${esc(designName)} — print separations</h1>
    <p class="hint">Each screen shares the same three registration crosshairs — burn them aligned and print each colour in register.</p>
  </header>
  ${body}
</body></html>`
}
