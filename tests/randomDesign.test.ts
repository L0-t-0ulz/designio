import { describe, it, expect } from 'vitest'
import {
  NECKLINES,
  RANDOM_RANGES,
  pickColor,
  pickInRange,
  pickOne,
  randomDesign,
  seededRandom
} from '../src/renderer/studio/randomDesign'

const garments = ['top', 'dress', 'skirt']
const fabrics = ['cotton', 'denim', 'silk']

describe('seeded random', () => {
  it('is reproducible — the same seed replays the same sequence', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('different seeds diverge', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)())
  })

  it('seed 0 still generates, rather than a constant', () => {
    const r = seededRandom(0)
    const out = [r(), r(), r()]
    expect(new Set(out).size).toBe(3)
  })

  it('stays inside [0, 1)', () => {
    const r = seededRandom(7)
    for (let i = 0; i < 500; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('pickInRange', () => {
  it('stays within bounds across the whole unit interval', () => {
    for (const u of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const v = pickInRange(() => u, 0.3, 0.95)
      expect(v).toBeGreaterThanOrEqual(0.3)
      expect(v).toBeLessThanOrEqual(0.95)
    }
  })

  it('snaps to the step, so a slider can reproduce the value', () => {
    expect(pickInRange(() => 0.5, 0, 1, 0.25) % 0.25).toBeCloseTo(0, 10)
  })

  it('does not leak float noise into the value', () => {
    // 0.30000000000000004 in a spec sheet looks like a bug
    expect(String(pickInRange(() => 0, 0.3, 0.95))).toBe('0.3')
  })
})

describe('pickOne', () => {
  it('picks the first and last items at the ends of the range', () => {
    expect(pickOne(() => 0, garments)).toBe('top')
    expect(pickOne(() => 0.999999, garments)).toBe('skirt')
  })

  it('never runs off the end, even if the generator returns 1', () => {
    expect(pickOne(() => 1, garments)).toBe('skirt')
  })

  it('returns undefined for an empty list', () => {
    expect(pickOne(() => 0.5, [])).toBeUndefined()
  })
})

describe('pickColor', () => {
  it('is a valid 24-bit colour', () => {
    const r = seededRandom(3)
    for (let i = 0; i < 200; i++) {
      const c = pickColor(r)
      expect(Number.isInteger(c)).toBe(true)
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(0xffffff)
    }
  })

  it('avoids near-black and near-white, which do not read as dyed cloth', () => {
    const r = seededRandom(11)
    for (let i = 0; i < 200; i++) {
      const c = pickColor(r)
      const [red, green, blue] = [(c >> 16) & 255, (c >> 8) & 255, c & 255]
      const lum = (red + green + blue) / 3
      expect(lum).toBeGreaterThan(30)
      expect(lum).toBeLessThan(230)
    }
  })
})

describe('randomDesign', () => {
  it('is fully reproducible from its seed', () => {
    expect(randomDesign(seededRandom(99), garments, fabrics)).toEqual(randomDesign(seededRandom(99), garments, fabrics))
  })

  it('only ever picks from the catalogues it was given', () => {
    for (let seed = 0; seed < 100; seed++) {
      const d = randomDesign(seededRandom(seed), garments, fabrics)!
      expect(garments).toContain(d.garmentType)
      expect(fabrics).toContain(d.fabricId)
      expect(NECKLINES).toContain(d.neckline)
    }
  })

  it('always produces values the panel sliders could have produced', () => {
    for (let seed = 0; seed < 200; seed++) {
      const d = randomDesign(seededRandom(seed), garments, fabrics)!
      expect(d.length).toBeGreaterThanOrEqual(RANDOM_RANGES.length.min)
      expect(d.length).toBeLessThanOrEqual(RANDOM_RANGES.length.max)
      expect(d.ease).toBeGreaterThanOrEqual(RANDOM_RANGES.ease.min)
      expect(d.ease).toBeLessThanOrEqual(RANDOM_RANGES.ease.max)
      expect(d.flare).toBeGreaterThanOrEqual(RANDOM_RANGES.flare.min)
      expect(d.flare).toBeLessThanOrEqual(RANDOM_RANGES.flare.max)
    }
  })

  it('never hands back a skin-tight negative ease unasked', () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(randomDesign(seededRandom(seed), garments, fabrics)!.ease).toBeGreaterThanOrEqual(0)
    }
  })

  it('actually varies across seeds rather than returning one design', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 60; seed++) seen.add(JSON.stringify(randomDesign(seededRandom(seed), garments, fabrics)))
    expect(seen.size).toBeGreaterThan(30)
  })

  it('returns null rather than a design pointing at nothing', () => {
    expect(randomDesign(seededRandom(1), [], fabrics)).toBeNull()
    expect(randomDesign(seededRandom(1), garments, [])).toBeNull()
  })
})
