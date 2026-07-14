import { describe, it, expect } from 'vitest'
import { formalBrimLift, FORMAL } from '../src/renderer/avatar/formalHats'

describe('the formal pair — top hat & bowler', () => {
  it('the topper curls only at the sides; front and back stay level', () => {
    expect(formalBrimLift('tophat', 0)).toBeCloseTo(0, 10)
    expect(formalBrimLift('tophat', Math.PI)).toBeCloseTo(0, 10)
    expect(formalBrimLift('tophat', Math.PI / 2)).toBeGreaterThan(0.1)
    expect(formalBrimLift('tophat', -Math.PI / 2)).toBeCloseTo(formalBrimLift('tophat', Math.PI / 2), 10)
  })

  it('the bowler rolls up around the whole perimeter, strongest at the sides', () => {
    const front = formalBrimLift('bowler', 0)
    const side = formalBrimLift('bowler', Math.PI / 2)
    expect(front).toBeGreaterThan(0.1) // lifted even at the front
    expect(side).toBeGreaterThan(front)
  })

  it('proportions: a tall flared stovepipe vs a hard low dome', () => {
    expect(FORMAL.tophat.crownH).toBeGreaterThan(1.4)
    expect(FORMAL.tophat.flare).toBeGreaterThan(1)
    expect(FORMAL.bowler.domeYScale).toBeLessThan(1)
    expect(FORMAL.tophat.crownH).toBeGreaterThan(FORMAL.bowler.domeR * FORMAL.bowler.domeYScale)
  })

  it('every lift stays bounded across the sweep', () => {
    for (const kind of ['tophat', 'bowler'] as const) {
      for (let az = 0; az < Math.PI * 2; az += 0.05) {
        const l = formalBrimLift(kind, az)
        expect(l).toBeGreaterThanOrEqual(0)
        expect(l).toBeLessThanOrEqual(0.34)
      }
    }
  })
})
