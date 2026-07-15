import { describe, it, expect } from 'vitest'
import { headTubeToSpec } from '../src/renderer/garments/factory'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import type { HeadTubePiece } from '../src/renderer/garments/schema'

const SNOOD: HeadTubePiece = { kind: 'headTube', anchor: 'neck', dropHi: 0.14, dropLo: 0.34, topScale: 1.6, botScale: 2.8, hood: true }
const m = MEASUREMENTS

describe('cowl-to-hood — the worn-state spec', () => {
  it('the default cowl sits around the neck (top near the neck, no face cut-out)', () => {
    const cowl = headTubeToSpec(SNOOD, DEFAULT_PARAMS, m)
    expect(cowl.topY).toBeLessThan(m.crownY) // around the neck, not over the head
    expect(cowl.cutouts).toBeUndefined()
  })

  it('worn as a hood, it rides UP over the crown with a front face opening', () => {
    const hood = headTubeToSpec(SNOOD, { ...DEFAULT_PARAMS, snoodWorn: 'hood' }, m)
    expect(hood.topY).toBeGreaterThanOrEqual(m.crownY) // pulled up over the skull top
    expect(hood.radiusTop).toBeLessThan(m.headR) // gathered over the crown — covered, no donut hole
    expect(hood.dome).toBeDefined() // spawns clamped on the skull dome (never inside)
    expect(hood.cutouts?.length).toBe(1) // one open-face opening for the face
    expect(hood.radiusStops?.length).toBe(2) // belly at the face, nip toward the neck
  })

  it('the hood drapes lower than the cowl top and further down onto the shoulders', () => {
    const cowl = headTubeToSpec(SNOOD, DEFAULT_PARAMS, m)
    const hood = headTubeToSpec(SNOOD, { ...DEFAULT_PARAMS, snoodWorn: 'hood' }, m)
    expect(hood.topY).toBeGreaterThan(cowl.topY) // the hood top is much higher (over the crown)
    expect(hood.bottomY).toBeLessThan(m.neckY) // it drapes below the neck onto the shoulders
  })

  it('a piece without `hood` never enters the hood state', () => {
    const plainCowl: HeadTubePiece = { ...SNOOD, hood: undefined }
    const spec = headTubeToSpec(plainCowl, { ...DEFAULT_PARAMS, snoodWorn: 'hood' }, m)
    expect(spec.cutouts).toBeUndefined() // ignored — this cowl can't hood
    expect(spec.topY).toBeLessThan(m.crownY)
  })
})
