/**
 * **Tile the flat pattern across A4/Letter pages at true 1:1 scale** — a home sewer
 * prints the pages, trims the margin, and tapes them into the full pattern. The pattern
 * panels are laid out in real millimetres; each page is a viewBox window into that
 * layout at 1:1, with corner registration crosshairs + a row/col label for assembly,
 * and a first "map" page showing the whole grid. Pure string builders (no DOM), so the
 * tiling math is unit-tested; the browser's Print → Save as PDF does the export.
 */
import type { PatternResult, PatternPanel, Pt } from './garmentPattern'
import { cutLine } from './garmentPattern'

export interface PageSize {
  /** Full sheet width/height in mm (A4 = 210 × 297, Letter = 216 × 279). */
  wMm: number
  hMm: number
}
/**
 * **ISO 216 A-series**, portrait (short edge × long edge), in millimetres.
 *
 * The series is defined by two properties: every sheet has the aspect ratio √2, and
 * A0 has an area of exactly 1 m². Halving a sheet across its long edge therefore
 * yields the next size down with the same ratio. The published millimetre figures are
 * that geometry **rounded down** to whole millimetres at each step — which is why
 * they are not exactly half their parent (A3 is 297 × 420, and half of A2's 594 is
 * 297 exactly, but A5's 148 is floor(210/√2) = 148, not 148.49).
 *
 * These are the standard's own values rather than computed at runtime: rounding down
 * *at each step* is not the same as rounding a closed-form expression, and a printer
 * driver expects the published numbers to the millimetre. `tests/tiledPrint` checks
 * them against the defining properties instead of trusting the table.
 */
export const A2: PageSize = { wMm: 420, hMm: 594 }
export const A3: PageSize = { wMm: 297, hMm: 420 }
export const A4: PageSize = { wMm: 210, hMm: 297 }
export const LETTER: PageSize = { wMm: 216, hMm: 279 }

/** The A-series sizes offered for tiled printing, largest first. */
export const PAGE_SIZES: { id: 'A2' | 'A3' | 'A4' | 'Letter'; label: string; page: PageSize }[] = [
  { id: 'A2', label: 'A2 (420 × 594 mm)', page: A2 },
  { id: 'A3', label: 'A3 (297 × 420 mm)', page: A3 },
  { id: 'A4', label: 'A4 (210 × 297 mm)', page: A4 },
  { id: 'Letter', label: 'Letter (216 × 279 mm)', page: LETTER }
]

/** Look a page size up by id; unknown ids fall back to A4 rather than throwing. */
export function pageSize(id: string): PageSize {
  return PAGE_SIZES.find((p) => p.id === id)?.page ?? A4
}

export interface TileOpts {
  page?: PageSize
  /** Printer margin left blank on every edge (mm). */
  marginMm?: number
  /** Overlap between tiles for taping (mm). */
  overlapMm?: number
}

export interface Tile {
  row: number
  col: number
  /** The mm window into the pattern layout this page shows. */
  xMm: number
  yMm: number
  wMm: number
  hMm: number
}
export interface TilePlan {
  cols: number
  rows: number
  /** Printable window per page (page − margins), mm. */
  pageWmm: number
  pageHmm: number
  tiles: Tile[]
}

/**
 * Split a content rectangle (mm) into a grid of overlapping page-sized tiles. Each tile
 * steps by (printable − overlap); the last row/col may extend past the content. Pure.
 */
export function tilePlan(contentWmm: number, contentHmm: number, opts: TileOpts = {}): TilePlan {
  const page = opts.page ?? A4
  const margin = opts.marginMm ?? 8
  const overlap = opts.overlapMm ?? 10
  const pageWmm = page.wMm - margin * 2
  const pageHmm = page.hMm - margin * 2
  const stepX = Math.max(1, pageWmm - overlap)
  const stepY = Math.max(1, pageHmm - overlap)
  const cols = Math.max(1, Math.ceil(Math.max(0, contentWmm - overlap) / stepX))
  const rows = Math.max(1, Math.ceil(Math.max(0, contentHmm - overlap) / stepY))
  const tiles: Tile[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({ row, col, xMm: col * stepX, yMm: row * stepY, wMm: pageWmm, hMm: pageHmm })
    }
  }
  return { cols, rows, pageWmm, pageHmm, tiles }
}

const bbox = (pts: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

/** Lay the panels' cut outlines left-to-right at 1:1 mm → the combined size + offsets. */
export function patternLayout(res: PatternResult, gapMm = 20): { wMm: number; hMm: number; placed: { panel: PatternPanel; cut: Pt[]; dx: number; dy: number }[] } {
  let x = 0
  let hMm = 0
  const placed = res.panels.map((panel) => {
    const cut = cutLine(panel.outline, res.seam)
    const b = bbox(cut)
    const dx = x - b.minX
    const dy = -b.minY
    x += b.maxX - b.minX + gapMm
    hMm = Math.max(hMm, b.maxY - b.minY)
    return { panel, cut, dx, dy }
  })
  return { wMm: Math.max(0, x - gapMm), hMm, placed }
}

const pathOf = (pts: Pt[], dx: number, dy: number): string =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x + dx).toFixed(1)} ${(p.y + dy).toFixed(1)}`).join(' ') + ' Z'

/** The full-pattern SVG inner fragment in mm coords (cut = dashed, sew = solid, grainline). */
function innerSVG(layout: ReturnType<typeof patternLayout>, res: PatternResult): string {
  return layout.placed
    .map(({ panel, cut, dx, dy }) => {
      const g = panel.grain
      return `<path d="${pathOf(cut, dx, dy)}" fill="none" stroke="#111" stroke-width="0.4" stroke-dasharray="4 3"/>
        <path d="${pathOf(panel.outline, dx, dy)}" fill="none" stroke="#6b5bd6" stroke-width="0.5"/>
        <line x1="${(g[0].x + dx).toFixed(1)}" y1="${(g[0].y + dy).toFixed(1)}" x2="${(g[1].x + dx).toFixed(1)}" y2="${(g[1].y + dy).toFixed(1)}" stroke="#111" stroke-width="0.4"/>`
    })
    .join('\n') +
    // seam-allowance legend note
    `<text x="1" y="${(layout.hMm - 1).toFixed(1)}" font-size="4" fill="#888">DesignIO — print at 100% (no scaling). Seam allowance ${res.seam} mm.</text>`
}

/** A page's corner registration crosshairs + a row/col assembly label (mm coords). */
function pageMarks(t: Tile): string {
  const cross = (cx: number, cy: number): string =>
    `<line x1="${cx - 4}" y1="${cy}" x2="${cx + 4}" y2="${cy}" stroke="#c0392b" stroke-width="0.3"/><line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy + 4}" stroke="#c0392b" stroke-width="0.3"/>`
  const corners = [
    [t.xMm + 2, t.yMm + 2],
    [t.xMm + t.wMm - 2, t.yMm + 2],
    [t.xMm + 2, t.yMm + t.hMm - 2],
    [t.xMm + t.wMm - 2, t.yMm + t.hMm - 2]
  ]
    .map(([x, y]) => cross(x, y))
    .join('')
  return `${corners}<text x="${t.xMm + 5}" y="${t.yMm + 8}" font-size="5" fill="#c0392b">R${t.row + 1} · C${t.col + 1}</text>`
}

/** Build the printable, tiled, to-scale pattern document (open + Print → Save as PDF). */
export function tiledPatternHTML(res: PatternResult, opts: TileOpts = {}): string {
  const page = opts.page ?? A4
  const layout = patternLayout(res)
  const plan = tilePlan(layout.wMm, layout.hMm, opts)
  const inner = innerSVG(layout, res)

  const mapCols = plan.cols
  const mapScale = 60 / Math.max(layout.wMm, 1) // small preview
  const mapGrid = plan.tiles
    .map((t) => `<rect x="${(t.xMm * mapScale).toFixed(1)}" y="${(t.yMm * mapScale).toFixed(1)}" width="${(t.wMm * mapScale).toFixed(1)}" height="${(t.hMm * mapScale).toFixed(1)}" fill="none" stroke="#c0392b" stroke-width="0.5"/><text x="${((t.xMm + t.wMm / 2) * mapScale).toFixed(1)}" y="${((t.yMm + t.hMm / 2) * mapScale).toFixed(1)}" font-size="4" fill="#c0392b" text-anchor="middle">R${t.row + 1}C${t.col + 1}</text>`)
    .join('')

  const tilePages = plan.tiles
    .map(
      (t) => `<section class="page"><svg width="${plan.pageWmm}mm" height="${plan.pageHmm}mm" viewBox="${t.xMm} ${t.yMm} ${t.wMm} ${t.hMm}" xmlns="http://www.w3.org/2000/svg">${inner}${pageMarks(t)}</svg></section>`
    )
    .join('\n')

  return `<!doctype html><html><head><meta charset="utf-8"><title>DesignIO — tiled pattern</title>
<style>
  @page { size: ${page.wMm}mm ${page.hMm}mm; margin: ${opts.marginMm ?? 8}mm; }
  html, body { margin: 0; font-family: system-ui, sans-serif; }
  .page { page-break-after: always; overflow: hidden; }
  .map { padding: 12mm; }
  h1 { font-size: 16px; } p { font-size: 12px; color: #555; }
</style></head><body>
  <section class="page map">
    <h1>Tiled pattern — ${plan.cols} × ${plan.rows} pages</h1>
    <p>Print at <strong>100% / actual size</strong> (no "fit to page"). Trim each sheet to the crosshairs, then tape by matching the R·C labels. Seam allowance ${res.seam} mm.</p>
    <svg width="${(layout.wMm * mapScale).toFixed(0)}" height="${(layout.hMm * mapScale).toFixed(0)}" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(${mapScale})">${inner}</g>${mapGrid}
    </svg>
    <p>Grid: ${mapCols} columns.</p>
  </section>
  ${tilePages}
</body></html>`
}
