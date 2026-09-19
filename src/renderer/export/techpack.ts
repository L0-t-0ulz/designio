import type { Measurements } from '../avatar/Mannequin'
import type { Fabric } from '../fabric/FabricLibrary'
import { trimTotals, type TrimLine } from './trimCard'
import { formatIncrement, irregularRows, type GradingTable } from './gradingTable'

export interface TechpackData {
  design: string
  mode: 'templates' | 'pattern'
  garment: Record<string, string | number>
  fabric: Fabric
  measurements: Measurements
  /** Everything that isn't fabric — the sourcing page (optional; omitted if empty). */
  trims?: TrimLine[]
  /** Points of measure across the size run, with grade increments. */
  grading?: GradingTable
}

const cm = (m: number): string => `${(m * 100).toFixed(1)} cm`

function rows(pairs: [string, string | number][]): string {
  return pairs.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')
}

const swatch = (c?: number): string =>
  c === undefined ? '' : `<span class="chip" style="background:#${c.toString(16).padStart(6, '0')}"></span>`

/**
 * The **trim card** — what to source, how much, and where it goes. Rendered as its
 * own section with a quantity column, because a factory buys from this table.
 * Omitted entirely when there are no trims rather than printing an empty heading.
 */
function trimCardSection(trims?: TrimLine[]): string {
  if (!trims?.length) return ''
  const t = trimTotals(trims)
  const body = trims
    .map(
      (l) =>
        `<tr><td>${swatch(l.color)}${l.item}</td><td class="num">${l.qty} ${l.unit}</td><td class="muted">${l.placement}</td></tr>`
    )
    .join('')
  return `
  <h2>Trim card</h2>
  <table class="trims">
    <thead><tr><th>Trim</th><th class="num">Qty</th><th>Placement</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td>Total</td><td class="num">${t.pcs} pcs · ${t.metres} m</td><td></td></tr></tfoot>
  </table>`
}

/**
 * The **grading table** — every point of measure across the size run, plus the
 * increment it grades by, which is the column a pattern grader actually works from.
 *
 * Rows that do not grade evenly are marked rather than quietly shown with a blank
 * increment: a non-linear grade is sometimes deliberate and sometimes a mistake, and
 * either way the grader needs to be told which rows to look at.
 */
function gradingSection(g?: GradingTable): string {
  if (!g?.rows.length) return ''
  const head = g.sizes.map((s) => `<th class="num">${s}</th>`).join('')
  const body = g.rows
    .map(
      (r) =>
        `<tr${r.uniform ? '' : ' class="irregular"'}><td>${r.label}${r.uniform ? '' : ' *'}</td>` +
        g.sizes.map((s) => `<td class="num">${r.bySize[s] === undefined ? '—' : r.bySize[s].toFixed(1)}</td>`).join('') +
        `<td class="num">${formatIncrement(r.increment)}</td><td class="num muted">±${r.tolCm.toFixed(1)}</td></tr>`
    )
    .join('')
  const odd = irregularRows(g)
  const note = odd.length
    ? `<div class="note">* ${odd.length} row${odd.length === 1 ? '' : 's'} do not grade by a constant step — check the grade rules for ${odd.map((r) => r.label).join(', ')}.</div>`
    : ''
  return `
  <h2>Grading table <span class="muted">(cm)</span></h2>
  <table class="grading">
    <thead><tr><th>Point of measure</th>${head}<th class="num">Grade</th><th class="num">Tol.</th></tr></thead>
    <tbody>${body}</tbody>
  </table>${note}`
}

/** A printable HTML tech-pack: garment spec, fabric, trim card, grading and body measurements. */
export function techpackHTML(d: TechpackData): string {
  const f = d.fabric
  const m = d.measurements
  return `<!doctype html><html><head><meta charset="utf-8"><title>${d.design} — Tech Pack</title>
<style>
  body{font:14px/1.5 system-ui,sans-serif;color:#1a1a22;margin:32px;max-width:760px}
  h1{margin:0 0 2px} .sub{color:#777;margin-bottom:20px}
  h2{margin:22px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#555}
  table{border-collapse:collapse;width:100%} td{padding:5px 8px;border-bottom:1px solid #eee}
  td:first-child{color:#666;width:45%}
  table.trims td:first-child{color:#1a1a22;width:auto}
  th{text-align:left;padding:5px 8px;border-bottom:1px solid #ddd;font-size:11px;text-transform:uppercase;
  letter-spacing:.4px;color:#888}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .muted{color:#888}
  table.grading td:first-child{color:#1a1a22;width:auto}
  tr.irregular td{background:#fff8e6}
  .note{color:#8a6d1f;font-size:12px;margin-top:6px}
  tfoot td{font-weight:600;border-top:1px solid #ddd} .chip{display:inline-block;width:14px;height:14px;border-radius:3px;
  vertical-align:middle;margin-right:6px;border:1px solid #0002}
</style></head><body>
  <h1>${d.design}</h1>
  <div class="sub">DesignIO tech pack · ${d.mode} mode</div>
  <h2>Garment</h2><table>${rows(Object.entries(d.garment))}</table>
  <h2>Fabric — ${f.name}</h2><table>${rows([
    ['Colour', `<span class="chip" style="background:#${f.color.toString(16).padStart(6, '0')}"></span>#${f.color.toString(16).padStart(6, '0')}`],
    ['Weight', `${f.gsm} gsm`],
    ['Weave', f.weave],
    ['Stretch', `${Math.round(f.stretch * 100)}%`],
    ['Drape (soft)', f.bendiness.toFixed(2)]
  ])}</table>
  ${trimCardSection(d.trims)}
  ${gradingSection(d.grading)}
  <h2>Body measurements</h2><table>${rows([
    ['Chest radius', cm(m.chestR)],
    ['Waist radius', cm(m.waistR)],
    ['Hip radius', cm(m.hipR)],
    ['Thigh radius', cm(m.thighR)],
    ['Shoulder height', cm(m.shoulderY)],
    ['Waist height', cm(m.waistY)],
    ['Hip height', cm(m.hipY)],
    ['Knee height', cm(m.kneeY)]
  ])}</table>
</body></html>`
}

/** The same data as JSON, for machine consumption. */
export function techpackJSON(d: TechpackData): string {
  return JSON.stringify(d, null, 2)
}
