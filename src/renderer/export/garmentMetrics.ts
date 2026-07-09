/**
 * Live garment **measurements** — the production spec. Derived from the exact same
 * construction the 3D garment + flat pattern come from (`garmentPatternSpecs` +
 * `garmentToPanels`), so the numbers always match what's on the body: key
 * circumferences + lengths, total fabric area, and total seam length. Pure +
 * unit-tested; the panel shows it live and the manufacturing export prints it.
 */
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentParams } from '../garment/templates'
import type { GarmentDefinition } from '../garments/schema'
import { garmentPatternSpecs } from '../garments/factory'
import { garmentToPanels } from './garmentPattern'
import { radiusAt } from '../cloth/Garment'
import { fitEase, type EaseRow } from './ease'

export interface MetricRow {
  label: string
  cm: number
}

export interface GarmentMetrics {
  garment: string
  size: string
  rows: MetricRow[]
  /** Fit ease (garment − body girth) at the drafted points: chest + waist. */
  ease: EaseRow[]
  /** Total cloth area across all panels (× copies), m². */
  fabricM2: number
  /** Total seam length across all panels, cm. */
  seamCm: number
}

const TAU = Math.PI * 2
const circ = (r: number): number => TAU * r * 100 // metres radius → cm circumference
const round1 = (v: number): number => Math.round(v * 10) / 10

export function garmentMetrics(
  garmentName: string,
  size: string,
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[]
): GarmentMetrics {
  const specs = garmentPatternSpecs(def, params, m, colliders)
  const rows: MetricRow[] = []

  for (const s of specs.body) {
    if (s.neckline != null) {
      // A bodice / dress: chest at the top, (optionally cinched) waist, hem sweep.
      rows.push({ label: 'Chest', cm: circ(s.radiusTop) })
      rows.push({ label: 'Waist', cm: circ(s.radiusWaist ?? radiusAt(s, 0.5)) })
      rows.push({ label: 'Hem sweep', cm: circ(s.radiusBottom) })
    } else {
      // A skirt from the waist.
      rows.push({ label: 'Waist', cm: circ(s.radiusTop) })
      rows.push({ label: 'Hem sweep', cm: circ(s.radiusBottom) })
    }
    rows.push({ label: 'Length', cm: (s.topY - s.bottomY) * 100 })
  }
  for (const s of specs.legs) {
    rows.push({ label: 'Waistband', cm: circ(s.radiusTop) })
    rows.push({ label: 'Leg opening', cm: circ(s.radiusBottom) })
    rows.push({ label: 'Inseam', cm: (s.topY - s.bottomY) * 100 })
  }
  for (const s of specs.sleeves) {
    const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y, s.b.z - s.a.z)
    rows.push({ label: 'Sleeve length', cm: len * 100 })
    rows.push({ label: 'Cuff', cm: circ(s.radiusEnd) })
  }

  // Fabric area + seam length from the real flat panels (× copies to cut).
  const { panels } = garmentToPanels(def, params, m, colliders)
  let areaMm2 = 0
  let seamMm = 0
  for (const p of panels) {
    const o = p.outline
    let a = 0
    let per = 0
    for (let i = 0; i < o.length; i++) {
      const j = (i + 1) % o.length
      a += o[i].x * o[j].y - o[j].x * o[i].y
      per += Math.hypot(o[j].x - o[i].x, o[j].y - o[i].y)
    }
    areaMm2 += (Math.abs(a) / 2) * p.cut
    seamMm += per * p.cut
  }

  return {
    garment: garmentName,
    size,
    rows: rows.map((r) => ({ label: r.label, cm: round1(r.cm) })),
    ease: fitEase(specs, m),
    fabricM2: Math.round((areaMm2 / 1e6) * 1000) / 1000,
    seamCm: round1(seamMm / 10)
  }
}
