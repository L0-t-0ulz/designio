import { describe, it, expect } from 'vitest'
import { qcBounds, qcSheetHTML } from '../src/renderer/export/qcSheet'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer } from '../src/renderer/studio/document'
import { pomTable } from '../src/renderer/export/pom'

describe('QC inspection sheet', () => {
  it('acceptance bounds = spec ± tol, cents-rounded', () => {
    expect(qcBounds(92.4, 1)).toEqual({ min: 91.4, max: 93.4 })
    expect(qcBounds(108, 1.5)).toEqual({ min: 106.5, max: 109.5 })
    expect(qcBounds(50.005, 0.1)).toEqual({ min: 49.91, max: 50.11 }) // rounded to cents of a cm
  })

  it('renders a measure-and-tick table: spec, tol, range, 5 blank samples, pass/fail', () => {
    const html = qcSheetHTML({
      name: 'Dress',
      styleRef: 'SS26-002',
      size: 'L',
      fabricName: 'Denim',
      rows: [
        { label: 'Chest', specCm: 96.4, tolCm: 1 },
        { label: 'Length', specCm: 108, tolCm: 1.5 }
      ]
    })
    expect(html).toContain('96.4')
    expect(html).toContain('±1.0')
    expect(html).toContain('95.4–97.4') // accept range
    expect(html).toContain('106.5–109.5')
    expect((html.match(/<td class="m"><\/td>/g) ?? []).length).toBe(10) // 5 blanks × 2 rows
    expect(html).toContain('Pass / fail')
    expect(html).toContain('AQL 2.5') // default sampling note
    expect(html).toContain('Inspector · date')
    expect(html).toContain('size L')
    expect(html).toContain('@page') // print CSS
  })

  it('escapes untrusted strings', () => {
    const html = qcSheetHTML({ name: '<b>x</b>', styleRef: 's', size: 'M', fabricName: 'f', rows: [] })
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;')
  })

  it('the live POM feeds it: every row has a finite graded spec at the layer size', () => {
    const mann = buildMannequin()
    const pom = pomTable(getGarment('dress'), defaultLayer('dress'), mann.measurements, mann.colliders)
    for (const r of pom.rows) {
      expect(Number.isFinite(r.bySize.L)).toBe(true)
      expect(r.tolCm).toBeGreaterThan(0)
    }
    expect(pom.rows.length).toBeGreaterThanOrEqual(3)
  })
})
