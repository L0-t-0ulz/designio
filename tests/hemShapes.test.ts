import { describe, it, expect } from 'vitest'
import { HEM_SHAPES, bottomEdge, type TubeSpec } from '../src/renderer/cloth/Garment'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

const spec: TubeSpec = { rings: 8, radial: 16, topY: 1.4, bottomY: 0.8, radiusTop: 0.15, radiusBottom: 0.2 }
const FRONT = Math.PI / 2
const BACK = (3 * Math.PI) / 2
const SIDE = 0

describe('high-low & asymmetric hems', () => {
  it('straight is flat; high-low lifts the front and trails the back', () => {
    expect(bottomEdge(spec, FRONT)).toBe(spec.bottomY)
    const hl: TubeSpec = { ...spec, hemShape: 'high-low' }
    expect(bottomEdge(hl, FRONT)).toBeGreaterThan(spec.bottomY) // front rises
    expect(bottomEdge(hl, BACK)).toBeLessThan(spec.bottomY) // back trails
    expect(bottomEdge(hl, SIDE)).toBeCloseTo(spec.bottomY, 10) // sides neutral
  })

  it('point-front drops the centre-front; back-flap drops the centre-back (a durag nape flap)', () => {
    const pf: TubeSpec = { ...spec, hemShape: 'point-front' }
    expect(bottomEdge(pf, FRONT)).toBeLessThan(spec.bottomY) // a point hangs at centre-front
    expect(bottomEdge(pf, BACK)).toBeCloseTo(spec.bottomY, 10) // back neutral
    const bf: TubeSpec = { ...spec, hemShape: 'back-flap' }
    expect(bottomEdge(bf, BACK)).toBeLessThan(spec.bottomY) // the flap drapes the nape
    expect(bottomEdge(bf, FRONT)).toBeCloseTo(spec.bottomY, 10) // front (the face) neutral
    expect(bottomEdge(bf, SIDE)).toBeCloseTo(spec.bottomY, 10) // sides neutral
    expect(bottomEdge(bf, BACK)).toBeLessThan(bottomEdge(pf, BACK)) // the durag flap hangs deeper at back than a front-point
  })

  it('shirttail vents rise at the sides; handkerchief points hang at the diagonals', () => {
    const st: TubeSpec = { ...spec, hemShape: 'shirttail' }
    expect(bottomEdge(st, SIDE)).toBeGreaterThan(spec.bottomY)
    expect(bottomEdge(st, FRONT)).toBeCloseTo(spec.bottomY, 10)
    const hk: TubeSpec = { ...spec, hemShape: 'handkerchief' }
    expect(bottomEdge(hk, Math.PI / 4)).toBeLessThan(spec.bottomY) // a corner point
    expect(bottomEdge(hk, FRONT)).toBeCloseTo(spec.bottomY, 10) // centre-front between points
    for (const shape of HEM_SHAPES) {
      for (let i = 0; i < 24; i++) expect(bottomEdge({ ...spec, hemShape: shape }, (i / 24) * Math.PI * 2)).toBeGreaterThanOrEqual(0.05)
    }
  })

  it('the 2D pattern follows the curve: the lifted front panel loses cloth, the trailing back gains it', () => {
    const mann = buildMannequin()
    const area = (pts: { x: number; y: number }[]): number => {
      let a = 0
      for (let i = 0; i < pts.length; i++) {
        const q = pts[(i + 1) % pts.length]
        a += pts[i].x * q.y - q.x * pts[i].y
      }
      return Math.abs(a / 2)
    }
    const straight = garmentToPanels(getGarment('dress'), gradeParams(defaultLayer('dress')), mann.measurements, mann.colliders)
    const highLow = garmentToPanels(getGarment('dress'), gradeParams({ ...defaultLayer('dress'), hemShape: 'high-low' }), mann.measurements, mann.colliders)
    const panel = (res: typeof straight, re: RegExp) => res.panels.find((p) => re.test(p.name))!
    expect(area(panel(highLow, /^Front/).outline)).toBeLessThan(area(panel(straight, /^Front/).outline) * 0.98)
    expect(area(panel(highLow, /^Back/).outline)).toBeGreaterThan(area(panel(straight, /^Back/).outline) * 1.01)
  })
})
