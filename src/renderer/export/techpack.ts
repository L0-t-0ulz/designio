import type { Measurements } from '../avatar/Mannequin'
import type { Fabric } from '../fabric/FabricLibrary'
import { trimTotals, type TrimLine } from './trimCard'

export interface TechpackData {
  design: string
  mode: 'templates' | 'pattern'
  garment: Record<string, string | number>
  fabric: Fabric
  measurements: Measurements
  /** Everything that isn't fabric — the sourcing page (optional; omitted if empty). */
  trims?: TrimLine[]
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

/** A printable HTML tech-pack: garment spec, fabric, trim card, and body measurements. */
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
