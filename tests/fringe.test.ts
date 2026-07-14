import { describe, it, expect } from 'vitest'
import { strandLength, stepStrand, fringeEdgeIndices } from '../src/renderer/garment/Fringe'
import { getGarment } from '../src/renderer/garments/registry'

describe('fringe trim', () => {
  it('strand lengths are deterministic with a bounded ±20% jitter', () => {
    for (let ix = 0; ix < 60; ix++) {
      const l = strandLength(ix)
      expect(l).toBe(strandLength(ix)) // no RNG — replays identically
      expect(l).toBeGreaterThanOrEqual(0.07 * 0.8)
      expect(l).toBeLessThanOrEqual(0.07 * 1.2)
    }
    // and it actually varies (cut yarn, not a ruler-straight comb)
    const set = new Set(Array.from({ length: 20 }, (_, ix) => strandLength(ix).toFixed(5)))
    expect(set.size).toBeGreaterThan(10)
    expect(strandLength(3, 0.1)).toBeCloseTo((strandLength(3) / 0.07) * 0.1, 10) // scales by base
  })

  it('skirts + dresses offer fringe; tops and trousers do not', () => {
    for (const id of ['skirt', 'maxi-skirt', 'dress', 'gown', 'slip-dress'] as const) {
      expect(getGarment(id).supports.fringe).toBe(true)
    }
    for (const id of ['top', 'pants', 'leggings', 'hoodie'] as const) {
      expect(getGarment(id).supports.fringe).toBeUndefined()
    }
  })

  it('scarves offer fringe too — it hangs off the tail hems (the end columns)', () => {
    expect(getGarment('scarf').supports.fringe).toBe(true)
    expect(getGarment('skinny-scarf').supports.fringe).toBe(true)
    // a 5×3 strip: ends = both end columns, hem = the bottom row
    expect(fringeEdgeIndices(5, 3, 'ends')).toEqual([0, 4, 5, 9, 10, 14])
    expect(fringeEdgeIndices(5, 3, 'hem')).toEqual([10, 11, 12, 13, 14])
  })
})

describe('fringe strands — real verlet chains, not painted', () => {
  const SEGS = 4
  const SEG_LEN = 0.02
  const DT = 1 / 60
  // seed a strand sticking out HORIZONTALLY from a top at the origin
  const seed = (): { pos: Float32Array; prev: Float32Array } => {
    const pos = new Float32Array(SEGS * 3)
    const prev = new Float32Array(SEGS * 3)
    for (let s = 0; s < SEGS; s++) {
      pos[s * 3] = prev[s * 3] = SEG_LEN * (s + 1)
    }
    return { pos, prev }
  }

  it('a horizontal strand falls and settles hanging plumb below its top', () => {
    const { pos, prev } = seed()
    for (let i = 0; i < 600; i++) stepStrand(pos, prev, 0, SEGS, 0, 0, 0, SEG_LEN, DT)
    const tip = (SEGS - 1) * 3
    expect(Math.abs(pos[tip])).toBeLessThan(1e-3) // under the top
    expect(pos[tip + 1]).toBeCloseTo(-SEGS * SEG_LEN, 3) // at full length
  })

  it('length projection holds every segment at its rest length', () => {
    const { pos, prev } = seed()
    for (let i = 0; i < 120; i++) stepStrand(pos, prev, 0, SEGS, 0, 0, 0, SEG_LEN, DT)
    let ax = 0
    let ay = 0
    let az = 0
    for (let s = 0; s < SEGS; s++) {
      const d = Math.hypot(pos[s * 3] - ax, pos[s * 3 + 1] - ay, pos[s * 3 + 2] - az)
      expect(d).toBeCloseTo(SEG_LEN, 6)
      ax = pos[s * 3]
      ay = pos[s * 3 + 1]
      az = pos[s * 3 + 2]
    }
  })

  it('the chain follows a moved top (drag, not teleport-snap)', () => {
    const { pos, prev } = seed()
    for (let i = 0; i < 300; i++) stepStrand(pos, prev, 0, SEGS, 0, 0, 0, SEG_LEN, DT)
    for (let i = 0; i < 600; i++) stepStrand(pos, prev, 0, SEGS, 0.3, 0, 0, SEG_LEN, DT)
    const tip = (SEGS - 1) * 3
    expect(pos[tip]).toBeCloseTo(0.3, 3) // re-settled plumb under the new top
    expect(pos[tip + 1]).toBeCloseTo(-SEGS * SEG_LEN, 3)
  })

  it('deterministic — two identical runs land on identical bytes', () => {
    const a = seed()
    const b = seed()
    for (let i = 0; i < 200; i++) {
      stepStrand(a.pos, a.prev, 0, SEGS, 0.01 * i, 0, 0, SEG_LEN, DT)
      stepStrand(b.pos, b.prev, 0, SEGS, 0.01 * i, 0, 0, SEG_LEN, DT)
    }
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos))
  })
})
