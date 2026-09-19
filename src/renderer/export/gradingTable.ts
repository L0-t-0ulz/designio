import type { SizeLabel } from '../studio/document'
import type { PomRow, PomSheet } from './pom'

/**
 * **Grading table** for the tech pack — each point of measure across the size run,
 * with the increment it grades by.
 *
 * `pomTable` already measures every point at every size; what makes a table a
 * *grading* table rather than a measurement table is the increment column, which is
 * what a pattern grader actually works from. Derived here rather than stored, so it
 * can never disagree with the measurements beside it.
 */

export interface GradingRow extends PomRow {
  /** Step between consecutive sizes (cm), when the row grades evenly. */
  increment: number | null
  /** False when the steps differ — a deliberate non-linear grade, or a mistake. */
  uniform: boolean
}

export interface GradingTable {
  sizes: SizeLabel[]
  rows: GradingRow[]
}

/** Floating-point noise in a measurement chain is not a grading irregularity. */
const TOLERANCE_CM = 0.051

/** Differences between consecutive sizes, in size order. */
export function gradeSteps(row: PomRow, sizes: SizeLabel[]): number[] {
  const steps: number[] = []
  for (let i = 1; i < sizes.length; i++) {
    const prev = row.bySize[sizes[i - 1]]
    const cur = row.bySize[sizes[i]]
    if (prev === undefined || cur === undefined) continue
    steps.push(Math.round((cur - prev) * 100) / 100)
  }
  return steps
}

/**
 * The single increment a row grades by, or null when it does not grade evenly.
 *
 * Rounded to 0.05 cm: measurements come off a simulated garment, so a row that grades
 * by 4 cm will show as 3.999 and 4.001 in places. Reporting that as an irregular
 * grade would cry wolf on every row.
 */
export function gradeIncrement(row: PomRow, sizes: SizeLabel[]): number | null {
  const steps = gradeSteps(row, sizes)
  if (!steps.length) return null
  const first = steps[0]
  return steps.every((s) => Math.abs(s - first) <= TOLERANCE_CM) ? Math.round(first * 20) / 20 : null
}

/** The POM sheet with an increment column. Row order and sizes are preserved. */
export function gradingTable(pom: PomSheet): GradingTable {
  return {
    sizes: pom.sizes,
    rows: pom.rows.map((row) => {
      const increment = gradeIncrement(row, pom.sizes)
      return { ...row, increment, uniform: increment !== null }
    })
  }
}

/** Rows that do not grade evenly — worth flagging on the sheet rather than hiding. */
export function irregularRows(table: GradingTable): GradingRow[] {
  return table.rows.filter((r) => !r.uniform)
}

/** Format an increment for the sheet: signed, 2 dp trimmed, or an em dash. */
export function formatIncrement(cm: number | null): string {
  if (cm === null) return '—'
  if (Math.abs(cm) < 0.005) return '0'
  const s = Math.abs(cm).toFixed(2).replace(/\.?0+$/, '')
  return `${cm > 0 ? '+' : '−'}${s}`
}
