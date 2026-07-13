import { describe, it, expect } from 'vitest'
import { KIDS_BLOCKS, KIDS_BLOCK_NAMES, getKidsBlock, applyKidsBlock } from '../src/renderer/avatar/kidsSizes'
import { bellySpec, bellyProtrusion, MAX_TRIMESTER } from '../src/renderer/avatar/maternity'
import { DEFAULT_BODY, MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { parseDoc, serializeDoc, defaultScene, docFromConfig } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

describe("kids' size range", () => {
  it('exposes the four age blocks, toddler → teen', () => {
    expect(KIDS_BLOCK_NAMES).toEqual(['toddler', 'child', 'tween', 'teen'])
  })

  it('stature grows with age and drives the height multiplier off the 175 cm base', () => {
    for (let i = 1; i < KIDS_BLOCKS.length; i++) {
      expect(KIDS_BLOCKS[i].ageYears).toBeGreaterThan(KIDS_BLOCKS[i - 1].ageYears)
      expect(KIDS_BLOCKS[i].statureCm).toBeGreaterThan(KIDS_BLOCKS[i - 1].statureCm)
      expect(KIDS_BLOCKS[i].shape.height).toBeGreaterThan(KIDS_BLOCKS[i - 1].shape.height)
    }
    expect(getKidsBlock('toddler')!.shape.height).toBeCloseTo(92 / 175, 10)
  })

  it('age-appropriate proportions, not scaled-down adults', () => {
    // head prominence (the head scales with build): build/height falls with age
    const prominence = KIDS_BLOCKS.map((k) => k.shape.build / k.shape.height)
    for (let i = 1; i < prominence.length; i++) expect(prominence[i]).toBeLessThan(prominence[i - 1])
    expect(prominence[0]).toBeGreaterThan(1.2) // a toddler's head reads big
    // torso straightness (waist/bust — no adult waist nip) also falls with age
    const straight = KIDS_BLOCKS.map((k) => k.shape.waist / k.shape.bust)
    for (let i = 1; i < straight.length; i++) expect(straight[i]).toBeLessThan(straight[i - 1])
    expect(straight[0]).toBeGreaterThan(1.2) // toddler: round tummy ≥ chest
  })

  it('applyKidsBlock sets the shape but keeps the figure (a boy = male)', () => {
    const boy = applyKidsBlock({ ...DEFAULT_BODY, bodyType: 'male' }, getKidsBlock('child')!)
    expect(boy.bodyType).toBe('male')
    expect(boy.height).toBeCloseTo(118 / 175, 10)
  })
})

describe('maternity fit', () => {
  const m = { waistR: MEASUREMENTS.waistR, waistY: MEASUREMENTS.waistY, hipY: MEASUREMENTS.hipY }

  it('trimester 0 keeps the bump buried inside the torso (default body unchanged)', () => {
    const s = bellySpec(0, m)
    expect(s.radius).toBeLessThan(m.waistR)
    expect(bellyProtrusion(s, m.waistR)).toBe(0)
  })

  it('the bump grows monotonically through the trimesters', () => {
    let prev = -1
    for (let t = 0; t <= MAX_TRIMESTER; t++) {
      const p = bellyProtrusion(bellySpec(t, m), m.waistR)
      expect(p).toBeGreaterThanOrEqual(prev)
      prev = p
    }
    // full term protrudes a believable 10–18 cm past the waist front
    const full = bellyProtrusion(bellySpec(3, m), m.waistR)
    expect(full).toBeGreaterThan(0.1)
    expect(full).toBeLessThan(0.18)
  })

  it('clamps out-of-range trimesters and spans navel → pubis', () => {
    expect(bellySpec(-2, m)).toEqual(bellySpec(0, m))
    expect(bellySpec(99, m)).toEqual(bellySpec(3, m))
    const s = bellySpec(2, m)
    expect(s.b[1]).toBeGreaterThan(s.a[1]) // top above bottom
    expect(s.a[1]).toBeGreaterThan(m.hipY) // above the pubis line
    expect(s.b[2]).toBeGreaterThan(0) // leans forward
  })

  it('belly rides the .dio (and is dropped when 0, keeping default docs neutral)', () => {
    const doc = docFromConfig(defaultConfig(), defaultScene())
    doc.body.belly = 2
    expect(parseDoc(serializeDoc(doc)).body.belly).toBe(2)
    doc.body.belly = 0
    expect('belly' in parseDoc(serializeDoc(doc)).body).toBe(false)
  })
})
