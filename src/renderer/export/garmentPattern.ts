/**
 * Real per-garment flat patterns. We *unwrap* the exact construction the 3D
 * garment is built from — the same `TubeSpec`s (`garmentPatternSpecs`) and the
 * same `topEdge`/`radiusAt` shaping functions the cloth mesh uses — into 2D
 * panels. So the pattern always matches the garment on the body: a scoop-neck
 * top unwraps with a scooped front, an A-line skirt to flared panels, trousers
 * to tapered legs, a sleeve to a shaped sleeve. Pure + unit-tested; SVG is for
 * viewing/printing, DXF for CAD/cutters.
 */
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentParams } from '../garment/templates'
import type { GarmentDefinition } from '../garments/schema'
import { garmentPatternSpecs } from '../garments/factory'
import { pocketPlacements } from '../garments/decor'
import { radiusAt, topEdge, type AxisTubeSpec, type TubeSpec } from '../cloth/Garment'

export interface Pt {
  x: number
  y: number
}

/** A finished pattern piece: a closed sew outline (mm, y-down, origin top-left). */
export interface PatternPanel {
  name: string
  /** How many to cut from fabric (mirror pieces = 2). */
  cut: number
  /** Closed boundary of the sew line, in mm. */
  outline: Pt[]
  /** Grainline endpoints (mm). */
  grain: [Pt, Pt]
  /** Notch marks (mm) that help match seams when sewing. */
  notches: Pt[]
  /** Sew-line size (mm), for the label. */
  wmm: number
  hmm: number
}

export interface PatternResult {
  panels: PatternPanel[]
  /** Seam allowance (mm). */
  seam: number
  /** Active construction detail (collar · cuffs · pleats · darts), for the caption. */
  detail?: string
  /** Front closure to draw on the Front panel(s): a button placket or a zip. */
  closure?: 'button' | 'zip'
}

const NCOL = 26 // samples across a panel (neckline/hem curve smoothness)
const NROW = 18 // samples down a panel (side-seam / waist-cinch smoothness)
const MM = 1000 // metres → mm

const bounds = (pts: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Unwrap one half of a body/skirt/leg tube into a flat panel. The horizontal
 * axis is arc-length from centre (`radiusAt(t) * (angle − centre)`), so flare
 * and waist cinch show as real edges; the top edge follows the neckline curve
 * (`topEdge`), the hem is flat. `centre` is the front (π/2) or back (3π/2) axis.
 */
function unwrapTube(spec: TubeSpec, centre: number): { outline: Pt[]; notches: Pt[] } {
  const aStart = centre - Math.PI / 2
  const aEnd = centre + Math.PI / 2
  const topAt = (a: number): number => topEdge(spec, a)
  // World Y range so we can flip to y-down mm with the shoulders at the top.
  const yTopMax = topAt(aStart) // sides (shoulders) are highest
  const worldToLocal = (x: number, worldY: number): Pt => ({ x: x * MM, y: (yTopMax - worldY) * MM })

  const colX = (a: number, t: number): number => radiusAt(spec, t) * (a - centre)
  const colY = (a: number, t: number): number => {
    const top = topAt(a)
    return top + (spec.bottomY - top) * t
  }

  const out: Pt[] = []
  // top edge: left → right (neckline curve, t = 0)
  for (let j = 0; j <= NCOL; j++) {
    const a = aStart + (aEnd - aStart) * (j / NCOL)
    out.push(worldToLocal(colX(a, 0), colY(a, 0)))
  }
  // right side seam: top → bottom (curves in at a cinched waist)
  for (let i = 1; i <= NROW; i++) {
    const t = i / NROW
    out.push(worldToLocal(colX(aEnd, t), colY(aEnd, t)))
  }
  // hem: right → left (t = 1)
  for (let j = NCOL - 1; j >= 0; j--) {
    const a = aStart + (aEnd - aStart) * (j / NCOL)
    out.push(worldToLocal(colX(a, 1), colY(a, 1)))
  }
  // left side seam: bottom → top
  for (let i = NROW - 1; i >= 1; i--) {
    const t = i / NROW
    out.push(worldToLocal(colX(aStart, t), colY(aStart, t)))
  }

  // Notch at the waist on both side seams (helps match front↔back when sewing).
  const wt = spec.radiusWaist != null ? (spec.waistT ?? 0.45) : 0.5
  const notches: Pt[] = [
    worldToLocal(colX(aStart, wt), colY(aStart, wt)),
    worldToLocal(colX(aEnd, wt), colY(aEnd, wt))
  ]
  return { outline: out, notches }
}

/** Unroll a tapered sleeve cylinder into a shaped sleeve panel (with a sleeve cap). */
function unwrapSleeve(spec: AxisTubeSpec): { outline: Pt[]; notches: Pt[] } {
  const height = Math.hypot(spec.b.x - spec.a.x, spec.b.y - spec.a.y, spec.b.z - spec.a.z) * MM
  const wTop = 2 * Math.PI * spec.radiusStart * MM
  const wBot = 2 * Math.PI * spec.radiusEnd * MM
  const cap = wTop * 0.12 // sleeve-cap rise at centre
  const out: Pt[] = []
  // cap curve (top), left → right — rises to the centre like a real sleeve head
  for (let j = 0; j <= NCOL; j++) {
    const f = j / NCOL
    out.push({ x: -wTop / 2 + wTop * f, y: cap * (1 - Math.sin(Math.PI * f)) })
  }
  out.push({ x: wBot / 2, y: cap + height }) // down the right underarm seam
  out.push({ x: -wBot / 2, y: cap + height }) // hem
  // Notches at the sleeve-cap quarter points (front/back of the cap).
  const notches: Pt[] = [
    { x: -wTop / 4, y: cap * (1 - Math.sin(Math.PI * 0.25)) },
    { x: wTop / 4, y: cap * (1 - Math.sin(Math.PI * 0.25)) }
  ]
  return { outline: out, notches }
}

const finishPanel = (
  name: string,
  cut: number,
  raw: { outline: Pt[]; notches: Pt[] }
): PatternPanel => {
  const b0 = bounds(raw.outline)
  const shift = (p: Pt): Pt => ({ x: p.x - b0.minX, y: p.y - b0.minY })
  const outline = raw.outline.map(shift)
  const notches = raw.notches.map(shift)
  const b = bounds(outline)
  const wmm = b.maxX - b.minX
  const hmm = b.maxY - b.minY
  const gx = wmm / 2
  const grain: [Pt, Pt] = [
    { x: gx, y: hmm * 0.12 },
    { x: gx, y: hmm * 0.88 }
  ]
  return { name, cut, outline, grain, notches, wmm, hmm }
}

/** Turn the current garment into flat pattern panels (front/back + sleeves + legs). */
export function garmentToPanels(
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[],
  seamMm = 10
): PatternResult {
  const seam = params.seam ?? seamMm // per-garment seam allowance (mm)
  const specs = garmentPatternSpecs(def, params, m, colliders)
  const panels: PatternPanel[] = []

  specs.body.forEach((spec, i) => {
    const suffix = specs.body.length > 1 ? ` ${i + 1}` : ''
    panels.push(finishPanel(`Front${suffix}`, 1, unwrapTube(spec, Math.PI / 2)))
    panels.push(finishPanel(`Back${suffix}`, 1, unwrapTube(spec, (3 * Math.PI) / 2)))
  })
  for (const spec of specs.legs) {
    panels.push(finishPanel('Leg front', 2, unwrapTube(spec, Math.PI / 2)))
    panels.push(finishPanel('Leg back', 2, unwrapTube(spec, (3 * Math.PI) / 2)))
  }
  if (specs.sleeves.length) {
    const shape = params.sleeveShape ?? 'set-in'
    const sname = shape === 'set-in' ? 'Sleeve' : `Sleeve (${shape})`
    panels.push(finishPanel(sname, 2, unwrapSleeve(specs.sleeves[0])))
  }

  if (params.pocket) {
    const style = params.pocketStyle ?? 'patch'
    const places = pocketPlacements(def, m)
    const cut = places.length || 1
    const w = (places[0]?.w ?? 0.11) * MM
    const h = (places[0]?.h ?? 0.12) * MM
    if (style === 'welt' || style === 'jetted') {
      // a welt/jetted pocket = a narrow welt strip (bagging is internal)
      const wh = h * (style === 'jetted' ? 0.22 : 0.32)
      const outline: Pt[] = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: wh }, { x: 0, y: wh }]
      panels.push(finishPanel(style === 'jetted' ? 'Jetted welt' : 'Welt', cut, { outline, notches: [] }))
    } else {
      // patch / flap / bellows: a patch (bellows adds side-gusset allowance) with a pointed hem
      const gw = style === 'bellows' ? w * 1.18 : w
      const outline: Pt[] = [{ x: 0, y: 0 }, { x: gw, y: 0 }, { x: gw, y: h * 0.72 }, { x: gw / 2, y: h }, { x: 0, y: h * 0.72 }]
      const notches: Pt[] = [{ x: 0, y: h * 0.14 }, { x: gw, y: h * 0.14 }] // top-fold line
      panels.push(finishPanel(style === 'bellows' ? 'Cargo pocket' : 'Pocket', cut, { outline, notches }))
      if (style === 'flap' || style === 'bellows') {
        const fh = h * 0.42
        const flap: Pt[] = [{ x: 0, y: 0 }, { x: gw, y: 0 }, { x: gw, y: fh * 0.6 }, { x: gw / 2, y: fh }, { x: 0, y: fh * 0.6 }]
        panels.push(finishPanel('Pocket flap', cut, { outline: flap, notches: [] }))
      }
    }
  }

  if (params.collar) {
    const style = params.collarStyle ?? 'band'
    const neckR = specs.body[0] ? specs.body[0].radiusTop * 0.6 : 0.11
    const w = Math.max(200, Math.PI * neckR * MM) // half neck circumference band (cut on the fold)
    const h = { band: 40, mandarin: 60, shirt: 80, peterpan: 95, notch: 105 }[style]
    let outline: Pt[]
    if (style === 'peterpan') {
      outline = [{ x: 0, y: h * 0.2 }, { x: w * 0.15, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: w * 0.1, y: h }] // curved flat collar half
    } else if (style === 'notch') {
      outline = [{ x: 0, y: 0 }, { x: w * 0.62, y: 0 }, { x: w, y: h * 0.7 }, { x: w, y: h }, { x: w * 0.28, y: h }] // slanted lapel with a notch
    } else {
      outline = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }] // stand band
    }
    const name = style === 'notch' ? 'Lapel' : style === 'peterpan' ? 'Collar (flat)' : style === 'shirt' ? 'Collar + stand' : 'Collar'
    panels.push(finishPanel(name, style === 'peterpan' || style === 'notch' ? 2 : 1, { outline, notches: [] }))
  }

  // Waistband — a straight band the width of the waist (cut on the fold), finished
  // ~50 mm deep; a drawstring adds a casing fold-line on it.
  if (params.waistband) {
    const spec0 = specs.body[0]
    const waistR = spec0 ? (spec0.radiusWaist ?? spec0.radiusTop) : m.waistR + params.ease
    const w = Math.max(200, Math.PI * waistR * MM)
    const h = 52
    const notches: Pt[] = params.drawstring ? [{ x: 0, y: h / 2 }, { x: w, y: h / 2 }] : [] // casing line
    panels.push(finishPanel('Waistband', 1, { outline: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], notches }))
  }
  // Neckline facing — a shaped band that finishes the neck edge on the inside.
  if (params.facing && specs.body[0]?.neckline) {
    const neckR = specs.body[0].radiusTop * 0.6
    const w = Math.max(160, Math.PI * neckR * MM)
    const h = 45
    panels.push(finishPanel('Neck facing', 2, { outline: [{ x: 0, y: h * 0.25 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], notches: [] }))
  }
  // Hem frill — a long strip gathered/flared onto the hem (ruffle = fullest).
  if (params.ruffles && specs.body[0]) {
    const style = params.frillStyle ?? 'ruffle'
    const fullness = { ruffle: 2.6, flounce: 1.9, godet: 1.6 }[style]
    const hemHalf = Math.PI * specs.body[0].radiusBottom * MM
    const w = Math.min(1400, hemHalf * fullness) // strip length (cut on the fold)
    const h = { ruffle: 90, flounce: 150, godet: 130 }[style]
    const name = style === 'godet' ? 'Godet' : style === 'flounce' ? 'Flounce' : 'Ruffle'
    panels.push(finishPanel(name, 1, { outline: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], notches: [] }))
  }

  if (params.notches === false) for (const p of panels) p.notches = [] // notches off
  const closure = params.closure ? (def.closureStyle ?? 'button') : undefined
  const active = [
    params.collar && `${params.collarStyle ?? 'band'} collar`,
    params.cuff && 'cuffs',
    params.pleats && `${params.pleatStyle ?? 'knife'} pleats`,
    params.dart && 'darts',
    params.pocket && `${params.pocketStyle ?? 'patch'} pocket`,
    params.hem && 'rolled hem',
    closure && `${closure} closure`,
    params.lined && 'lined',
    params.interfaced && 'interfaced',
    params.waistband && 'waistband',
    params.facing && 'facing',
    params.drawstring && 'drawstring',
    params.ruffles && `${params.frillStyle ?? 'ruffle'} frill`,
    params.boning && 'boning + lacing',
    params.ribbing && 'knit ribbing',
    specs.sleeves.length > 0 && (params.sleeveShape ?? 'set-in') !== 'set-in' && `${params.sleeveShape} sleeve`
  ].filter(Boolean) as string[]
  return { panels, seam, detail: active.length ? active.join(' · ') : undefined, closure }
}

// ---- polygon offset (cut line = sew line + seam allowance) ----------------
const centroid = (pts: Pt[]): Pt => {
  let x = 0
  let y = 0
  for (const p of pts) {
    x += p.x
    y += p.y
  }
  return { x: x / pts.length, y: y / pts.length }
}

/** Offset a closed polygon outward by `d` mm (per-vertex averaged edge normal). */
export function offsetPolygon(pts: Pt[], d: number): Pt[] {
  const n = pts.length
  const c = centroid(pts)
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const prev = pts[(i - 1 + n) % n]
    const next = pts[(i + 1) % n]
    const e1 = { x: p.x - prev.x, y: p.y - prev.y }
    const e2 = { x: next.x - p.x, y: next.y - p.y }
    const n1 = { x: e1.y, y: -e1.x }
    const n2 = { x: e2.y, y: -e2.x }
    let nx = n1.x + n2.x
    let ny = n1.y + n2.y
    const len = Math.hypot(nx, ny) || 1
    nx /= len
    ny /= len
    if (nx * (p.x - c.x) + ny * (p.y - c.y) < 0) {
      nx = -nx
      ny = -ny
    } // ensure outward
    out.push({ x: p.x + nx * d, y: p.y + ny * d })
  }
  return out
}

// ---- SVG ------------------------------------------------------------------
const path = (pts: Pt[], dx: number, dy: number): string =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x + dx).toFixed(1)} ${(p.y + dy).toFixed(1)}`).join(' ') + ' Z'

export function panelsToSVG(res: PatternResult): string {
  const { panels, seam } = res
  const margin = 24
  const gap = 34
  const cutOf = (p: PatternPanel): { minX: number; minY: number; maxX: number; maxY: number } =>
    bounds(offsetPolygon(p.outline, seam))
  const maxH = Math.max(0, ...panels.map((p) => cutOf(p).maxY - cutOf(p).minY))
  let totalW = margin
  for (const p of panels) {
    const c = cutOf(p)
    totalW += c.maxX - c.minX + gap
  }
  totalW += margin - gap
  const totalH = margin * 2 + maxH + 30

  const TS = 6 // topstitch inset from the sew line (mm)
  // Centre-front placket guide (Front panel is unwrapped centred on CF, so it's the panel's mid-x).
  const placket = (p: PatternPanel, dx: number, dy: number, style: 'button' | 'zip'): string => {
    const cx = p.wmm / 2 + dx
    const y0 = dy + 10
    const y1 = dy + p.hmm - 10
    const line = `<line x1="${cx.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#6b5bd6" stroke-width="1.3"${style === 'zip' ? '' : ' stroke-dasharray="6 4"'}/>`
    if (style === 'zip') return line
    const n = Math.max(3, Math.round((y1 - y0) / 45))
    let dots = ''
    for (let i = 0; i < n; i++) {
      const y = y0 + ((y1 - y0) * (i + 0.5)) / n
      dots += `<circle cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="none" stroke="#6b5bd6" stroke-width="1.2"/>`
    }
    return line + dots
  }
  let x = margin
  const parts: string[] = []
  for (const p of panels) {
    const cut = offsetPolygon(p.outline, seam)
    const cb = bounds(cut)
    const dx = x - cb.minX // seat the cut bbox at the running x
    const dy = margin - cb.minY
    // Topstitch guide: a dashed line inset from the sew line (skip panels too small to inset).
    const stitch = Math.min(p.wmm, p.hmm) > 4 * TS ? offsetPolygon(p.outline, -TS) : null
    const plk = res.closure && p.name.startsWith('Front') ? placket(p, dx, dy, res.closure) : ''
    parts.push(`
      <g>
        <path d="${path(cut, dx, dy)}" fill="none" stroke="#9aa0aa" stroke-width="1.4" stroke-dasharray="7 4"/>
        <path d="${path(p.outline, dx, dy)}" fill="#f4f2ee" stroke="#222" stroke-width="1.6"/>
        ${stitch ? `<path d="${path(stitch, dx, dy)}" fill="none" stroke="#b8863b" stroke-width="1" stroke-dasharray="4 3"/>` : ''}
        ${plk}
        <line x1="${(p.grain[0].x + dx).toFixed(1)}" y1="${(p.grain[0].y + dy).toFixed(1)}"
          x2="${(p.grain[1].x + dx).toFixed(1)}" y2="${(p.grain[1].y + dy).toFixed(1)}"
          stroke="#5b6472" stroke-width="1.2"/>
        <polygon points="${(p.grain[0].x + dx - 4).toFixed(1)},${(p.grain[0].y + dy + 10).toFixed(1)} ${(p.grain[0].x + dx + 4).toFixed(1)},${(p.grain[0].y + dy + 10).toFixed(1)} ${(p.grain[0].x + dx).toFixed(1)},${(p.grain[0].y + dy).toFixed(1)}" fill="#5b6472"/>
        <polygon points="${(p.grain[1].x + dx - 4).toFixed(1)},${(p.grain[1].y + dy - 10).toFixed(1)} ${(p.grain[1].x + dx + 4).toFixed(1)},${(p.grain[1].y + dy - 10).toFixed(1)} ${(p.grain[1].x + dx).toFixed(1)},${(p.grain[1].y + dy).toFixed(1)}" fill="#5b6472"/>
        ${p.notches
          .map(
            (nn) =>
              `<circle cx="${(nn.x + dx).toFixed(1)}" cy="${(nn.y + dy).toFixed(1)}" r="3" fill="none" stroke="#c0392b" stroke-width="1.3"/>`
          )
          .join('')}
        <text x="${(p.wmm / 2 + dx).toFixed(1)}" y="${(p.hmm / 2 + dy).toFixed(1)}"
          font-family="sans-serif" font-size="16" text-anchor="middle" fill="#333">${p.name}</text>
        <text x="${(p.wmm / 2 + dx).toFixed(1)}" y="${(p.hmm / 2 + dy + 20).toFixed(1)}"
          font-family="sans-serif" font-size="10" text-anchor="middle" fill="#8a8f98">cut ${p.cut} · ${Math.round(p.wmm)} × ${Math.round(p.hmm)} mm</text>
      </g>`)
    x += cb.maxX - cb.minX + gap
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW.toFixed(0)}mm" height="${totalH.toFixed(0)}mm"
  viewBox="0 0 ${totalW.toFixed(0)} ${totalH.toFixed(0)}">
  <rect width="${totalW.toFixed(0)}" height="${totalH.toFixed(0)}" fill="#fff"/>
  <text x="${margin}" y="${(totalH - 10).toFixed(0)}" font-family="sans-serif" font-size="11" fill="#9aa0aa">
    DesignIO pattern · solid = sew line · grey dashed = cut line (SA ${seam} mm) · gold dashed = topstitch · purple = CF closure · arrow = grainline · ○ = notch${res.detail ? ` · detail: ${res.detail}` : ''}</text>
  ${parts.join('\n')}
</svg>`
}

// ---- DXF ------------------------------------------------------------------
export function panelsToDXF(res: PatternResult): string {
  const { panels, seam } = res
  const lines: string[] = ['0', 'SECTION', '2', 'ENTITIES']
  const poly = (pts: Pt[], dx: number, layer: string): void => {
    lines.push('0', 'LWPOLYLINE', '8', layer, '90', String(pts.length), '70', '1')
    for (const p of pts) lines.push('10', (p.x + dx).toFixed(2), '20', p.y.toFixed(2))
  }
  let x = 0
  for (const p of panels) {
    const cut = offsetPolygon(p.outline, seam)
    const cb = bounds(cut)
    const dx = x - cb.minX
    poly(cut, dx, 'CUT')
    poly(p.outline, dx, 'SEW')
    x += cb.maxX - cb.minX + 30
  }
  lines.push('0', 'ENDSEC', '0', 'EOF')
  return lines.join('\n')
}

/** Convenience: current garment → pattern SVG / DXF strings. */
export function garmentPatternSVG(
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[]
): string {
  return panelsToSVG(garmentToPanels(def, params, m, colliders))
}
export function garmentPatternDXF(
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[]
): string {
  return panelsToDXF(garmentToPanels(def, params, m, colliders))
}
