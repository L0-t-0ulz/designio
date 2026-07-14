import { describe, it, expect } from 'vitest'
import { cowboyBrimLift, COWBOY } from '../src/renderer/avatar/cowboy'

describe('the cowboy hat — side-rolled brim', () => {
  it('rolls highest at the sides, dips at front + back', () => {
    const side = cowboyBrimLift(Math.PI / 2)
    expect(side).toBeGreaterThan(0.3)
    expect(cowboyBrimLift(0)).toBeLessThan(0) // front shades the face
    expect(cowboyBrimLift(Math.PI)).toBeCloseTo(cowboyBrimLift(0), 10) // back matches front
    expect(cowboyBrimLift(-Math.PI / 2)).toBeCloseTo(side, 10) // left↔right symmetric
  })

  it('sweeps smoothly and stays bounded', () => {
    for (let az = 0; az < Math.PI * 2; az += 0.05) {
      const l = cowboyBrimLift(az)
      expect(l).toBeGreaterThanOrEqual(-0.1)
      expect(l).toBeLessThanOrEqual(0.4)
    }
  })

  it('the block is a wide brim over a tall crown', () => {
    expect(COWBOY.brimOuterR).toBeGreaterThan(1.8) // a statement brim
    expect(COWBOY.crownYScale).toBeGreaterThan(1.4) // taller than the fedora dome
  })
})
