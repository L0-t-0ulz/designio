import { describe, it, expect } from 'vitest'
import { formatIncrement, gradeIncrement, gradeSteps, gradingTable, irregularRows } from '../src/renderer/export/gradingTable'
import type { PomRow, PomSheet } from '../src/renderer/export/pom'
import type { SizeLabel } from '../src/renderer/studio/document'

const SIZES: SizeLabel[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const row = (label: string, values: number[], tolCm = 1): PomRow => ({
  label,
  tolCm,
  bySize: Object.fromEntries(SIZES.map((s, i) => [s, values[i]])) as Record<SizeLabel, number>
})

const sheet = (rows: PomRow[]): PomSheet => ({ sizes: SIZES, rows })

describe('grade steps', () => {
  it('is the difference between consecutive sizes', () => {
    expect(gradeSteps(row('Chest', [84, 88, 92, 96, 100, 104]), SIZES)).toEqual([4, 4, 4, 4, 4])
  })

  it('handles a shrinking measurement', () => {
    expect(gradeSteps(row('Rise', [30, 29, 28, 27, 26, 25]), SIZES)).toEqual([-1, -1, -1, -1, -1])
  })

  it('skips a size with no measurement rather than inventing a step', () => {
    const partial = row('Chest', [84, 88, 92, 96, 100, 104])
    delete (partial.bySize as Record<string, number | undefined>).L
    expect(gradeSteps(partial, SIZES)).toEqual([4, 4, 4]) // XS→S, S→M, XL→XXL
  })

  it('is empty for a single size', () => {
    expect(gradeSteps(row('Chest', [84]), ['M'] as SizeLabel[])).toEqual([])
  })
})

describe('grade increment', () => {
  it('reports the common step of an evenly graded row', () => {
    expect(gradeIncrement(row('Chest', [84, 88, 92, 96, 100, 104]), SIZES)).toBe(4)
  })

  it('tolerates simulation noise rather than crying wolf', () => {
    // these come off a simulated garment; 3.999 and 4.001 are the same 4 cm grade
    expect(gradeIncrement(row('Chest', [84, 87.999, 92.001, 96, 100.002, 104]), SIZES)).toBe(4)
  })

  it('returns null for a genuinely irregular grade', () => {
    expect(gradeIncrement(row('Chest', [84, 88, 92, 98, 104, 110]), SIZES)).toBeNull()
  })

  it('reports zero for a row that does not grade at all', () => {
    // a collar band often stays put across the run — that is 0, not "irregular"
    expect(gradeIncrement(row('Collar', [7, 7, 7, 7, 7, 7]), SIZES)).toBe(0)
  })

  it('returns null when there is nothing to compare', () => {
    expect(gradeIncrement(row('Chest', [84]), ['M'] as SizeLabel[])).toBeNull()
  })
})

describe('grading table', () => {
  it('keeps the sizes and the row order of the POM sheet', () => {
    const t = gradingTable(sheet([row('Chest', [84, 88, 92, 96, 100, 104]), row('Waist', [66, 70, 74, 78, 82, 86])]))
    expect(t.sizes).toEqual(SIZES)
    expect(t.rows.map((r) => r.label)).toEqual(['Chest', 'Waist'])
  })

  it('carries the measurements and tolerances through unchanged', () => {
    const t = gradingTable(sheet([row('Chest', [84, 88, 92, 96, 100, 104], 1.5)]))
    expect(t.rows[0].bySize.M).toBe(92)
    expect(t.rows[0].tolCm).toBe(1.5)
  })

  it('marks rows as uniform or not', () => {
    const t = gradingTable(sheet([row('Chest', [84, 88, 92, 96, 100, 104]), row('Odd', [10, 12, 15, 19, 24, 30])]))
    expect(t.rows[0].uniform).toBe(true)
    expect(t.rows[1].uniform).toBe(false)
    expect(t.rows[1].increment).toBeNull()
  })

  it('surfaces the irregular rows, because a grader needs to be told which to check', () => {
    const t = gradingTable(sheet([row('Chest', [84, 88, 92, 96, 100, 104]), row('Odd', [10, 12, 15, 19, 24, 30])]))
    expect(irregularRows(t).map((r) => r.label)).toEqual(['Odd'])
  })

  it('does not mutate the POM sheet it was handed', () => {
    const src = sheet([row('Chest', [84, 88, 92, 96, 100, 104])])
    gradingTable(src)
    expect('increment' in src.rows[0]).toBe(false)
  })

  it('handles an empty sheet', () => {
    expect(gradingTable({ sizes: SIZES, rows: [] }).rows).toEqual([])
    expect(irregularRows({ sizes: SIZES, rows: [] })).toEqual([])
  })
})

describe('increment formatting', () => {
  it('signs the value so the direction is unmistakable', () => {
    expect(formatIncrement(4)).toBe('+4')
    expect(formatIncrement(-1.5)).toBe('−1.5')
  })

  it('trims trailing zeros rather than printing +4.00', () => {
    expect(formatIncrement(4.5)).toBe('+4.5')
    expect(formatIncrement(0.25)).toBe('+0.25')
  })

  it('shows a non-grading row as plain zero, not +0', () => {
    expect(formatIncrement(0)).toBe('0')
  })

  it('shows an em dash when there is no single increment', () => {
    expect(formatIncrement(null)).toBe('—')
  })
})
