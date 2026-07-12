import { describe, it, expect } from 'vitest'
import { sizeSetFiles } from '../src/renderer/export/sizeSet'
import { garmentPatternSVG } from '../src/renderer/export/garmentPattern'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams, SIZES } from '../src/renderer/studio/document'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

describe('production size set', () => {
  it('plans slug-safe SVG+DXF filenames across the whole run', () => {
    const files = sizeSetFiles('Slip dress / SS26')
    expect(files.map((f) => f.size)).toEqual([...SIZES])
    expect(files[0].svgName).toBe('Slip-dress-SS26-XS.svg')
    expect(files[5].dxfName).toBe('Slip-dress-SS26-XXL.dxf')
    expect(new Set(files.flatMap((f) => [f.svgName, f.dxfName])).size).toBe(12) // no collisions
    expect(sizeSetFiles('   ')[0].svgName).toBe('pattern-XS.svg') // junk name falls back
  })

  it('the per-size patterns really are graded (XS ≠ XXL geometry)', () => {
    const mann = buildMannequin()
    const def = getGarment('dress')
    const l = defaultLayer('dress')
    const xs = garmentPatternSVG(def, gradeParams({ ...l, size: 'XS' }), mann.measurements, mann.colliders)
    const xxl = garmentPatternSVG(def, gradeParams({ ...l, size: 'XXL' }), mann.measurements, mann.colliders)
    expect(xs).not.toBe(xxl)
    expect(xs.length).toBeGreaterThan(500) // real documents, not stubs
  })
})
