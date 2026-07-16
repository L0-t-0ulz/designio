/**
 * Manufacturing hand-off: one self-contained, printable document for the whole
 * outfit — per garment, a measured **spec sheet** (cm + in), a **fabric BOM**
 * (fabric, weight, estimated area/yardage) and the **flat pattern** embedded, plus
 * the body block it was drafted to. "Design it here → send this off to be made."
 * Pure string builders (no DOM), so they're unit-testable.
 */
import type { GarmentMetrics } from './garmentMetrics'
import type { PomSheet } from './pom'
import { markerSVG, type MarkerLayout } from './marker'
import { threadMetres } from './thread'
import { SEAM_TYPES, stitchLengthMm, threadMetresFor } from '../garment/stitchTypes'
import { priceFromCost, type CostBreakdown } from './cost'
import { careSymbolsSVG, type CareSymbol } from './careSymbols'
import type { Footprint, MaterialPassport } from './sustainability'
import { escapeHtml as esc } from './html'
import { approvalBadgeHtml } from './approval'

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
  /** Metal hardware trims (rivets / eyelets / snaps / belt buckle) as BOM lines. */
  hardware?: { label: string }[]
  /** Seam allowance (mm). */
  seam?: number
  /** Seam & topstitch spec (one-line summary + the raw spec for JSON). */
  stitch?: { summary: string; spec: import('../garment/stitchTypes').StitchSpec }
  /** Zipper spec summary (present when the closure is a zip). */
  zipper?: string
  /** Fully-fashioned knit shaping note (present for a shaped knit garment). */
  fullyFashioned?: string
  /** Physical fabric override in real units (one-line spec). */
  physical?: string
  /** Auto-generated care label — fibre content + laundering instructions. */
  fibre?: string
  care?: string[]
  /** ISO 3758 care symbols derived from the care instructions. */
  careSymbols?: CareSymbol[]
  metrics: GarmentMetrics
  /** Graded points-of-measure across the size run (XS…XXL). */
  pom?: PomSheet
  /** Nested marker (fabric layout) for the realistic yield + efficiency. */
  marker?: MarkerLayout
  /** Landed cost breakdown (fabric + thread + labour + overhead). */
  cost?: CostBreakdown
  /** Sustainability: material passport + footprint + circular score + longevity tips. */
  sustainability?: { passport: MaterialPassport; footprint: Footprint; circularScore: number; longevity: string[] }
  /** Sourcing estimate for the body fabric (supplier profile + lead time). */
  supplier?: { source: string; leadWeeksMin: number; leadWeeksMax: number }
  /** Flat pattern in DXF-AAMA layers for the factory pack (CAD import). */
  patternDxfAama?: string
  patternSVG: string
}

export interface ManufactureBundle {
  title: string
  /** Sign-off status shown as a badge in the header (optional). */
  approval?: import('./approval').ApprovalRecord
  body: { bodyType: string; height: number; build: number; bust: number; waist: number; hips: number }
  layers: ManufactureLayer[]
}

const inch = (cm: number): string => (cm / 2.54).toFixed(1)
const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')
const FABRIC_WIDTH_M = 1.4 // bolt width for the yardage estimate

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

/** Graded points-of-measure table across the size run + head-sizing for headwear; omitted when empty. */
function pomSection(pom?: PomSheet): string {
  if (!pom || (!pom.rows.length && !pom.head)) return ''
  let out = ''
  if (pom.rows.length) {
    const sizeHdr = pom.sizes.map((s) => `<th>${esc(s)}</th>`).join('')
    const rows = pom.rows
      .map(
        (r) =>
          `<tr><td>${esc(r.label)}</td>${pom.sizes.map((s) => `<td>${(r.bySize[s] ?? 0).toFixed(1)}</td>`).join('')}<td>±${r.tolCm.toFixed(1)}</td></tr>`
      )
      .join('')
    out += `<h3>Graded spec — points of measure (cm)</h3>
    <table class="pom">
      <thead><tr><th>Point of measure</th>${sizeHdr}<th>Tol</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  }
  out += headSizingSection(pom.head)
  return out
}

/** Head-circumference sizing (headwear) — the fitted circ + hat size run. */
function headSizingSection(h?: PomSheet['head']): string {
  if (!h) return ''
  const cells = h.run.map((s) => `<th${s.label === h.size ? ' style="background:#eee7ff"' : ''}>${esc(s.label)}</th>`).join('')
  const spans = h.run.map((s) => `<td>${s.minCm.toFixed(1)}–${s.maxCm.toFixed(1)}</td>`).join('')
  const earNote = h.earFit ? ` · ${esc(h.earFit)}` : ''
  const hairNote =
    h.withHairSize && h.withHairSize !== h.size
      ? ` · with hair: size ${esc(h.withHairSize)} (+${h.hairVolumeCm!.toFixed(1)} cm)`
      : h.hairVolumeCm
        ? ` · +${h.hairVolumeCm.toFixed(1)} cm hair (same size)`
        : ''
  const gripNote = h.bandGripKpa ? ` · elastic grip ${h.bandGripKpa.toFixed(1)} kPa` : ''
  return `<h3>Head sizing <span style="font-weight:400;opacity:.6">(fitted: ${h.circCm.toFixed(1)} cm → size ${esc(h.size)}${earNote}${hairNote}${gripNote})</span></h3>
    <table class="pom">
      <thead><tr><th>Hat size</th>${cells}</tr></thead>
      <tbody><tr><td>Head circ (cm)</td>${spans}</tr></tbody>
    </table>`
}

/** Nested-marker preview (fabric layout) + its efficiency; omitted when empty. */
function markerSection(m?: MarkerLayout): string {
  if (!m || !m.placements.length) return ''
  return `<h3>Marker (@ ${m.widthCm.toFixed(0)} cm) — ${(m.lengthCm / 100).toFixed(2)} m · ${(m.efficiency * 100).toFixed(0)}% efficient</h3>
    <div class="marker">${markerSVG(m)}</div>`
}

/** Landed-cost breakdown table (fabric + thread + trims + labour + overhead → cost/unit). */
function costSection(c?: CostBreakdown): string {
  if (!c) return ''
  const usd = (v: number): string => `$${v.toFixed(2)}`
  return `<h3>Cost sheet <span style="font-weight:400;opacity:.6">(estimate)</span></h3>
        <table>
          <tbody>
            <tr><td>Fabric</td><td colspan="2">${usd(c.fabric)}</td></tr>
            <tr><td>Thread</td><td colspan="2">${usd(c.thread)}</td></tr>
            ${c.trims > 0 ? `<tr><td>Trims / notions</td><td colspan="2">${usd(c.trims)}</td></tr>` : ''}
            <tr><td>Labour</td><td colspan="2">${usd(c.labour)}</td></tr>
            <tr><td>Overhead / waste</td><td colspan="2">${usd(c.overhead)}</td></tr>
            <tr><td><strong>Landed cost / unit</strong></td><td colspan="2"><strong>${usd(c.total)} ${c.currency}</strong></td></tr>
          </tbody>
        </table>
        ${pricingSection(c)}`
}

/** Suggested wholesale + retail pricing from the landed cost at a 50 % target margin. */
function pricingSection(c: CostBreakdown): string {
  const usd = (v: number): string => `$${v.toFixed(2)}`
  const p = priceFromCost({ cost: c.total })
  return `<h3>Pricing <span style="font-weight:400;opacity:.6">(50 % margin · keystone retail)</span></h3>
        <table>
          <tbody>
            <tr><td>Wholesale / unit</td><td colspan="2">${usd(p.wholesale)} ${p.currency}</td></tr>
            <tr><td>Gross margin</td><td colspan="2">${usd(p.marginUsd)} (${Math.round(p.marginPct * 100)} %)</td></tr>
            <tr><td><strong>Suggested retail</strong></td><td colspan="2"><strong>${usd(p.retail)} ${p.currency}</strong></td></tr>
          </tbody>
        </table>`
}

function sustainabilitySection(su?: ManufactureLayer['sustainability']): string {
  if (!su) return ''
  const flags = [su.passport.recycled && 'recycled', su.passport.deadstock && 'deadstock', su.passport.monoMaterial && 'mono-material', su.passport.recyclable && 'recyclable fibre'].filter(Boolean).join(' · ')
  return `<h3>Sustainability <span style="font-weight:400;opacity:.6">(estimate)</span></h3>
        <table>
          <tbody>
            <tr><td>Material passport</td><td colspan="2">${esc(su.passport.fibre)} (${esc(su.passport.group)})${flags ? ' · ' + esc(flags) : ''}</td></tr>
            <tr><td>Fabric mass</td><td colspan="2">${su.footprint.massKg.toFixed(2)} kg</td></tr>
            <tr><td>Water footprint</td><td colspan="2">≈ ${su.footprint.waterL.toLocaleString()} L</td></tr>
            <tr><td>CO₂ footprint</td><td colspan="2">≈ ${su.footprint.co2Kg.toFixed(1)} kg CO₂e</td></tr>
            <tr><td>Circular-design score</td><td colspan="2">${su.circularScore} / 100</td></tr>
            ${su.longevity.map((t) => `<tr><td>Longevity</td><td colspan="2">${esc(t)}</td></tr>`).join('')}
          </tbody>
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
            ${l.supplier ? `<tr><td>Sourcing (est.)</td><td colspan="2">${esc(l.supplier.source)} · ${l.supplier.leadWeeksMin}–${l.supplier.leadWeeksMax} wks</td></tr>` : ''}
            <tr><td>Colour</td><td colspan="2"><span class="dot" style="background:${hex(l.color)}"></span>${l.colorRef ? esc(l.colorRef) : hex(l.color)}</td></tr>
            ${(l.parts ?? []).map((p) => `<tr><td>Fabric (${esc(p.part)})</td><td colspan="2">${esc(p.fabric)}</td></tr>`).join('')}
            ${l.trim ? `<tr><td>Trim</td><td colspan="2">${esc(l.trim)}</td></tr>` : ''}
            ${(l.hardware ?? []).map((h) => `<tr><td>Hardware</td><td colspan="2">${esc(h.label)}</td></tr>`).join('')}
            <tr><td>Seam allowance</td><td colspan="2">${l.seam ?? 10} mm</td></tr>
            ${l.stitch ? `<tr><td>Seams &amp; stitching</td><td colspan="2">${esc(l.stitch.summary)}</td></tr>` : ''}
            ${l.zipper ? `<tr><td>Zipper</td><td colspan="2">${esc(l.zipper)}</td></tr>` : ''}
            ${l.fullyFashioned ? `<tr><td>Knit shaping</td><td colspan="2">${esc(l.fullyFashioned)}</td></tr>` : ''}
            ${l.physical ? `<tr><td>Fabric spec (measured)</td><td colspan="2">${esc(l.physical)}</td></tr>` : ''}
            <tr><td>Cloth area</td><td colspan="2">${l.metrics.fabricM2.toFixed(2)} m²</td></tr>
            ${
              l.marker
                ? `<tr><td>Marker (@ ${FABRIC_WIDTH_M * 100} cm)</td><td colspan="2">${(l.marker.lengthCm / 100).toFixed(2)} m · ${((l.marker.lengthCm / 100) * 1.094).toFixed(2)} yd · ${(l.marker.efficiency * 100).toFixed(0)}% eff.</td></tr>`
                : `<tr><td>Yardage (@ ${FABRIC_WIDTH_M * 100} cm)</td><td colspan="2">${lengthM.toFixed(2)} m · ${(lengthM * 1.094).toFixed(2)} yd</td></tr>`
            }
            <tr><td>Total seam length</td><td colspan="2">${l.metrics.seamCm.toFixed(0)} cm</td></tr>
            ${
              l.stitch
                ? `<tr><td>Thread (est., ${esc(SEAM_TYPES[l.stitch.spec.seamType].label)})</td><td colspan="2">${threadMetresFor(l.metrics.seamCm, l.stitch.spec).toFixed(1)} m</td></tr>`
                : `<tr><td>Thread (est., lockstitch)</td><td colspan="2">${threadMetres(l.metrics.seamCm).toFixed(1)} m</td></tr>`
            }
          </tbody>
        </table>
        ${costSection(l.cost)}
        ${sustainabilitySection(l.sustainability)}
        ${
          l.fibre || l.care
            ? `<h3>Care &amp; content</h3>
        <table>
          <tbody>
            ${l.fibre ? `<tr><td>Fibre content</td><td colspan="2">${esc(l.fibre)}</td></tr>` : ''}
            ${(l.care ?? []).map((c) => `<tr><td>Care</td><td colspan="2">${esc(c)}</td></tr>`).join('')}
          </tbody>
        </table>
        ${l.careSymbols?.length ? careSymbolsSVG(l.careSymbols) : ''}`
            : ''
        }
      </div>
      <div class="pattern">
        <h3>Flat pattern</h3>
        ${l.patternSVG}
      </div>
    </div>
    ${pomSection(l.pom)}
    ${markerSection(l.marker)}
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
  .marker { border: 1px solid #eee; border-radius: 8px; padding: 8px; max-width: 520px; }
  .marker svg { display: block; max-height: 360px; }
  .care-symbols { display: flex; gap: 14px; margin: 4px 0 2px; flex-wrap: wrap; }
  .care-sym { margin: 0; text-align: center; }
  .care-sym figcaption { font-size: 10px; color: #6b7280; margin-top: 2px; }
  footer { color: #9aa0aa; font-size: 11px; margin-top: 28px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>${esc(b.title)}</h1>
  <p class="sub">Manufacturing pack · ${b.layers.length} garment${b.layers.length === 1 ? '' : 's'} · DesignIO${b.approval ? ' · ' + approvalBadgeHtml(b.approval) : ''}</p>
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
        care_symbols: l.careSymbols ? Object.fromEntries(l.careSymbols.map((s) => [s.key, s.variant])) : null,
        color: hex(l.color),
        color_ref: l.colorRef ?? null,
        measurements_cm: Object.fromEntries(l.metrics.rows.map((r) => [r.label, r.cm])),
        fit_ease_cm: Object.fromEntries(l.metrics.ease.map((e) => [e.label, e.easeCm])),
        points_of_measure: l.pom
          ? { sizes: l.pom.sizes, rows: l.pom.rows.map((r) => ({ point: r.label, tolerance_cm: r.tolCm, ...r.bySize })) }
          : null,
        fabric_area_m2: l.metrics.fabricM2,
        yardage_m: +((l.marker ? l.marker.lengthCm / 100 : l.metrics.fabricM2 / FABRIC_WIDTH_M).toFixed(2)),
        marker_efficiency_pct: l.marker ? Math.round(l.marker.efficiency * 100) : null,
        seam_length_cm: l.metrics.seamCm,
        thread_m: l.stitch ? +threadMetresFor(l.metrics.seamCm, l.stitch.spec).toFixed(1) : threadMetres(l.metrics.seamCm),
        fabric_physical: l.physical ?? null,
        stitching: l.stitch
          ? { ...l.stitch.spec, stitch_length_mm: +stitchLengthMm(l.stitch.spec.spi).toFixed(2), summary: l.stitch.summary }
          : null,
        cost: l.cost ?? null
      }))
    },
    null,
    2
  )
}
