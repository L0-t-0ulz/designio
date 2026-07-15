/**
 * **Points of measure (POM)** — the graded spec table a factory is actually cut to:
 * every key measurement across the whole size run (XS…XXL) with a tolerance (± cm).
 * Built from the same `garmentMetrics` the spec sheet uses, re-run per size through
 * the app's girth grading (`gradeParams`/`sizeEase`), so the graded numbers match
 * what the garment would really be at each size.
 *
 * Note on lengths: at the default grade rules the app grades **girth** (ease) by
 * size, not length — girth rows (chest/waist/hem/…) step per size while
 * length/inseam/sleeve rows are constant. A layer's custom **grade rules**
 * (`GradeRules` — girth/length/sleeve cm per step) change that: the rows step by
 * exactly what the 3D piece actually grades by (honest POM either way).
 *
 * Pure + unit-tested; the manufacturing pack prints it.
 */
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentDefinition } from '../garments/schema'
import { garmentMetrics } from './garmentMetrics'
import { headSizing, type HeadSizing } from './headSizing'
import { SIZES, gradeParams, type GarmentLayerData, type SizeLabel } from '../studio/document'

export interface PomRow {
  /** Point of measure — e.g. 'Chest', 'Waist', 'Length'. */
  label: string
  /** Measurement (cm) at each size across the run. */
  bySize: Record<SizeLabel, number>
  /** Half-tolerance (± cm) for this point. */
  tolCm: number
}

export interface PomSheet {
  sizes: SizeLabel[]
  rows: PomRow[]
  /** Head-circumference sizing (headwear garments only) — the fitted circ + hat size run. */
  head?: HeadSizing
}

/** Standard grading tolerance: girths ±1.0 cm, lengths ±1.5 cm. */
const tolFor = (label: string): number => (/length|inseam|sleeve/i.test(label) ? 1.5 : 1.0)

/**
 * The graded POM sheet for a garment: each `garmentMetrics` row measured across the
 * full size run. Preserves the row order of the base spec.
 */
export function pomTable(def: GarmentDefinition, data: GarmentLayerData, m: Measurements, colliders: Capsule[]): PomSheet {
  const rows: PomRow[] = []
  const byLabel = new Map<string, PomRow>()
  for (const size of SIZES) {
    const mts = garmentMetrics(def.name, size, def, gradeParams({ ...data, size }), m, colliders)
    for (const r of mts.rows) {
      let row = byLabel.get(r.label)
      if (!row) {
        row = { label: r.label, bySize: {} as Record<SizeLabel, number>, tolCm: tolFor(r.label) }
        byLabel.set(r.label, row)
        rows.push(row)
      }
      row.bySize[size] = r.cm
    }
  }
  // Headwear (a head/neck tube) also carries a head-circumference size run.
  const isHeadwear = def.pieces.some((p) => p.kind === 'headTube')
  return { sizes: SIZES, rows, head: isHeadwear ? headSizing(m.headR) : undefined }
}
