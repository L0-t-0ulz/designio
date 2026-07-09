/**
 * **Points of measure (POM)** — the graded spec table a factory is actually cut to:
 * every key measurement across the whole size run (XS…XXL) with a tolerance (± cm).
 * Built from the same `garmentMetrics` the spec sheet uses, re-run per size through
 * the app's girth grading (`gradeParams`/`sizeEase`), so the graded numbers match
 * what the garment would really be at each size.
 *
 * Note on lengths: the app grades **girth** (ease) by size, not length — so the
 * girth rows (chest/waist/hem/…) step per size while length/inseam/sleeve rows are
 * constant across the run. That mirrors the actual garment geometry (honest POM),
 * rather than inventing a length grade the 3D piece doesn't have.
 *
 * Pure + unit-tested; the manufacturing pack prints it.
 */
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentDefinition } from '../garments/schema'
import { garmentMetrics } from './garmentMetrics'
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
  return { sizes: SIZES, rows }
}
