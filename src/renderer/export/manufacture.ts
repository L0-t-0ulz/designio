/**
 * Manufacturing hand-off: one self-contained, printable document for the whole
 * outfit — per garment, a measured **spec sheet** (cm + in), a **fabric BOM**
 * (fabric, weight, estimated area/yardage) and the **flat pattern** embedded, plus
 * the body block it was drafted to. "Design it here → send this off to be made."
 * Pure string builders (no DOM), so they're unit-testable.
 */
import type { GarmentMetrics } from './garmentMetrics'
import type { PomSheet } from './pom'

export interface ManufactureLayer {
  name: string
  size: string
  fabricName: string
  gsm: number
  color: number
  /** Production colour reference (named textile library, e.g. "TR-6030 Classic Navy"). */
  colorRef?: string
  /** Per-part fabric overrides (e.g. leather sleeves) for the BOM. */
  parts?: { part: string; fabric: string }[]
  /** Contrast trim fabric/colour, if any. */
  trim?: string
  /** Seam allowance (mm). */
  seam?: number
  /** Auto-generated care label — fibre content + laundering instructions. */
  fibre?: string
  care?: string[]
  metrics: GarmentMetrics
  /** Graded points-of-measure across the size run (XS…XXL). */
  pom?: PomSheet
  patternSVG: string
}

export interface ManufactureBundle {
  title: string
  body: { bodyType: string; height: number; build: number; bust: number; waist: number; hips: number }
  layers: ManufactureLayer[]
}

const inch = (cm: number): string => (cm / 2.54).toFixed(1)
const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')
const FABRIC_WIDTH_M = 1.4 // bolt width for the yardage estimate
const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

function specRows(m: GarmentMetrics): string {
  return m.rows
    .map((r) => `<tr><td>${esc(r.label)}</td><td>${r.cm.toFixed(1)}</td><td>${inch(r.cm)}</td></tr>`)
    .join('')
}

const signed = (cm: number): string => `${cm >= 0 ? '+' : '−'}${Math.abs(cm).toFixed(1)}`

/** Fit-ease table (garment − body girth at chest/waist); omitted when empty. */
function easeSection(m: GarmentMetrics): string {
  if (!m.ease.length) return ''
  const rows = m.ease
    .map((e) => `<tr><td>${esc(e.label)}</td><td>${e.bodyCm.toFixed(1)}</td><td>${e.garmentCm.toFixed(1)}</td><td>${signed(e.easeCm)}</td></tr>`)
    .join('')
  return `<h3>Fit ease</h3>
        <table>
          <thead><tr><th>Point</th><th>Body cm</th><th>Garment cm</th><th>Ease cm</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
}

/** Graded points-of-measure table across the size run; full width, omitted when empty. */
function pomSection(pom?: PomSheet): string {
  if (!pom || !pom.rows.length) return ''
  const head = pom.sizes.map((s) => `<th>${esc(s)}</th>`).join('')
  const rows = pom.rows
    .map(
      (r) =>
        `<tr><td>${esc(r.label)}</td>${pom.sizes.map((s) => `<td>${(r.bySize[s] ?? 0).toFixed(1)}</td>`).join('')}<td>±${r.tolCm.toFixed(1)}</td></tr>`
    )
    .join('')
  return `<h3>Graded spec — points of measure (cm)</h3>
    <table class="pom">
      <thead><tr><th>Point of measure</th>${head}<th>Tol</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
}

function layerSection(l: ManufactureLayer): string {
  const lengthM = l.metrics.fabricM2 / FABRIC_WIDTH_M
  return `
  <section class="garment">
    <h2><span class="dot" style="background:${hex(l.color)}"></span>${esc(l.name)} · size ${esc(l.size)}</h2>
    <div class="cols">
      <div>
        <h3>Spec sheet</h3>
        <table>
          <thead><tr><th>Measurement</th><th>cm</th><th>in</th></tr></thead>
          <tbody>${specRows(l.metrics)}</tbody>
        </table>
        ${easeSection(l.metrics)}
        <h3>Bill of materials</h3>
        <table>
          <tbody>
            <tr><td>Fabric (body)</td><td colspan="2">${esc(l.fabricName)} · ${l.gsm} gsm</td></tr>
            <tr><td>Colour</td><td colspan="2"><span class="dot" style="background:${hex(l.color)}"></span>${l.colorRef ? esc(l.colorRef) : hex(l.color)}</td></tr>
            ${(l.parts ?? []).map((p) => `<tr><td>Fabric (${esc(p.part)})</td><td colspan="2">${esc(p.fabric)}</td></tr>`).join('')}
            ${l.trim ? `<tr><td>Trim</td><td colspan="2">${esc(l.trim)}</td></tr>` : ''}
            <tr><td>Seam allowance</td><td colspan="2">${l.seam ?? 10} mm</td></tr>
            <tr><td>Cloth area</td><td colspan="2">${l.metrics.fabricM2.toFixed(2)} m²</td></tr>
            <tr><td>Yardage (@ ${FABRIC_WIDTH_M * 100} cm)</td><td colspan="2">${lengthM.toFixed(2)} m · ${(lengthM * 1.094).toFixed(2)} yd</td></tr>
            <tr><td>Total seam length</td><td colspan="2">${l.metrics.seamCm.toFixed(0)} cm</td></tr>
          </tbody>
        </table>
        ${
          l.fibre || l.care
            ? `<h3>Care &amp; content</h3>
        <table>
          <tbody>
            ${l.fibre ? `<tr><td>Fibre content</td><td colspan="2">${esc(l.fibre)}</td></tr>` : ''}
            ${(l.care ?? []).map((c) => `<tr><td>Care</td><td colspan="2">${esc(c)}</td></tr>`).join('')}
          </tbody>
        </table>`
            : ''
        }
      </div>
      <div class="pattern">
        <h3>Flat pattern</h3>
        ${l.patternSVG}
      </div>
    </div>
    ${pomSection(l.pom)}
  </section>`
}

export function manufactureHTML(b: ManufactureBundle): string {
  const body = b.body
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${esc(b.title)} — manufacturing pack</title>
<style>
  :root { color-scheme: light; }
  body { font: 13px/1.5 system-ui, sans-serif; color: #1a1a22; margin: 0; padding: 32px; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 26px 0 10px; display: flex; align-items: center; gap: 8px; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; margin: 14px 0 6px; }
  .sub { color: #6b7280; margin: 0 0 8px; }
  .dot { width: 13px; height: 13px; border-radius: 4px; display: inline-block; box-shadow: inset 0 0 0 1px rgba(0,0,0,.2); }
  table { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #eee; font-variant-numeric: tabular-nums; }
  th { color: #6b7280; font-weight: 600; font-size: 11px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .garment { break-inside: avoid; border-top: 2px solid #f0f0f2; padding-top: 6px; }
  .pattern svg { width: 100%; height: auto; border: 1px solid #eee; border-radius: 8px; }
  .pom { margin-top: 8px; }
  .pom td:not(:first-child), .pom th:not(:first-child) { text-align: right; }
  footer { color: #9aa0aa; font-size: 11px; margin-top: 28px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>${esc(b.title)}</h1>
  <p class="sub">Manufacturing pack · ${b.layers.length} garment${b.layers.length === 1 ? '' : 's'} · DesignIO</p>
  <h3>Fit block (mannequin)</h3>
  <table><tbody>
    <tr><td>Figure</td><td>${esc(body.bodyType)}</td><td>Height</td><td>${(body.height * 100).toFixed(0)}%</td></tr>
    <tr><td>Build</td><td>${(body.build * 100).toFixed(0)}%</td><td>Bust / Waist / Hips</td><td>${(body.bust * 100).toFixed(0)} / ${(body.waist * 100).toFixed(0)} / ${(body.hips * 100).toFixed(0)}%</td></tr>
  </tbody></table>
  ${b.layers.map(layerSection).join('')}
  <footer>Generated by DesignIO · solid = sew line · dashed = cut line (seam allowance) · arrow = grainline.</footer>
</body></html>`
}

export function manufactureJSON(b: ManufactureBundle): string {
  return JSON.stringify(
    {
      title: b.title,
      body: b.body,
      garments: b.layers.map((l) => ({
        name: l.name,
        size: l.size,
        fabric: { name: l.fabricName, gsm: l.gsm },
        part_fabrics: l.parts ?? [],
        trim: l.trim ?? null,
        seam_allowance_mm: l.seam ?? 10,
        fibre_content: l.fibre ?? null,
        care: l.care ?? [],
        color: hex(l.color),
        color_ref: l.colorRef ?? null,
        measurements_cm: Object.fromEntries(l.metrics.rows.map((r) => [r.label, r.cm])),
        fit_ease_cm: Object.fromEntries(l.metrics.ease.map((e) => [e.label, e.easeCm])),
        points_of_measure: l.pom
          ? { sizes: l.pom.sizes, rows: l.pom.rows.map((r) => ({ point: r.label, tolerance_cm: r.tolCm, ...r.bySize })) }
          : null,
        fabric_area_m2: l.metrics.fabricM2,
        yardage_m: +(l.metrics.fabricM2 / FABRIC_WIDTH_M).toFixed(2),
        seam_length_cm: l.metrics.seamCm
      }))
    },
    null,
    2
  )
}
