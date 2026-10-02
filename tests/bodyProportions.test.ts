import { describe, it, expect } from 'vitest'
import { neckLift, proportionOf, scaledBelow, storedProportion } from '../src/renderer/avatar/bodyProportions'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { parseDoc, serializeDoc, docFromConfig } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

describe('body proportions', () => {
  it('treats a missing multiplier as the authored figure', () => {
    expect(proportionOf(undefined)).toBe(1)
    expect(proportionOf(Number.NaN)).toBe(1)
    expect(neckLift(0.09, undefined)).toBe(0)
    expect(scaledBelow(0.98, 0.52, undefined)).toBeCloseTo(0.52, 9)
  })

  it('clamps into the slider range and omits the neutral value from a project', () => {
    expect(proportionOf(4)).toBe(1.22)
    expect(proportionOf(0.1)).toBe(0.82)
    expect(storedProportion(1)).toBeUndefined()
    expect(storedProportion('long')).toBeUndefined()
    expect(storedProportion(1.15)).toBeCloseTo(1.15, 9)
    expect(neckLift(0.1, 1.2)).toBeCloseTo(0.02, 9)
  })

  it('lengthens the leg from the hip and leaves the hip where it is', () => {
    expect(scaledBelow(0.98, 0.98, 1.2)).toBeCloseTo(0.98, 9)
    expect(scaledBelow(0.98, 0.5, 1.2)).toBeLessThan(0.5)
  })
})

describe('proportions on the mannequin', () => {
  it('leaves the default figure unchanged and moves only the part a slider names', () => {
    const base = buildMannequin()
    const neutral = buildMannequin({ neck: 1, leg: 1, thigh: 1, calf: 1 })
    expect(neutral.measurements.crownY).toBeCloseTo(base.measurements.crownY, 6)
    expect(neutral.measurements.ankleY).toBeCloseTo(base.measurements.ankleY, 6)
    expect(neutral.measurements.thighR).toBeCloseTo(base.measurements.thighR, 6)
    expect(neutral.colliders[8].radius).toBeCloseTo(base.colliders[8].radius, 6)

    const neck = buildMannequin({ neck: 1.2 })
    expect(neck.measurements.crownY).toBeGreaterThan(base.measurements.crownY)
    expect(neck.measurements.ankleY).toBeCloseTo(base.measurements.ankleY, 6)

    const leg = buildMannequin({ leg: 1.15 })
    expect(leg.measurements.ankleY).toBeLessThan(base.measurements.ankleY)
    expect(leg.measurements.hipY).toBeCloseTo(base.measurements.hipY, 6)
    expect(leg.colliders[7].a.y).toBeCloseTo(base.colliders[7].a.y, 5)

    const thigh = buildMannequin({ thigh: 1.15 })
    expect(thigh.measurements.thighR).toBeGreaterThan(base.measurements.thighR * 1.1)
    expect(thigh.colliders[8].radius).toBeCloseTo(base.colliders[8].radius, 6)

    const calf = buildMannequin({ calf: 1.15 })
    expect(calf.colliders[8].radius).toBeGreaterThan(base.colliders[8].radius * 1.1)
    expect(calf.colliders[12].radius).toBeCloseTo(calf.colliders[8].radius, 6)
    expect(calf.measurements.thighR).toBeCloseTo(base.measurements.thighR, 6)

    const shoulder = buildMannequin({ shoulder: 1.15 })
    expect(shoulder.measurements.shoulderHalfX).toBeGreaterThan(base.measurements.shoulderHalfX * 1.1)
    expect(shoulder.measurements.hipHalfX).toBeCloseTo(base.measurements.hipHalfX, 6)

    const torso = buildMannequin({ torso: 1.15 })
    expect(torso.measurements.shoulderY).toBeGreaterThan(base.measurements.shoulderY)
    expect(torso.measurements.hipY).toBeCloseTo(base.measurements.hipY, 6)

    const wristY = (m: ReturnType<typeof buildMannequin>): number => Math.min(m.colliders[6].a.y, m.colliders[6].b.y)
    const shoulderY = (m: ReturnType<typeof buildMannequin>): number => Math.max(m.colliders[5].a.y, m.colliders[5].b.y)
    const arm = buildMannequin({ arm: 1.15 })
    expect(wristY(arm)).toBeLessThan(wristY(base))
    expect(shoulderY(arm)).toBeCloseTo(shoulderY(base), 5)
  })
})

describe('proportions in a project file', () => {
  it('round-trips a set proportion and drops the neutral one', () => {
    const doc = docFromConfig(defaultConfig())
    doc.body.neck = 1.1
    doc.body.leg = 1
    const back = parseDoc(serializeDoc(doc))
    expect(back.body.neck).toBeCloseTo(1.1, 6)
    expect(back.body.leg).toBeUndefined()
    const clamped = parseDoc(JSON.stringify({ ...doc, body: { ...doc.body, calf: 9 } }))
    expect(clamped.body.calf).toBe(1.22)
  })
})
