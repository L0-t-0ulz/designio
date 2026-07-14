import { describe, it, expect } from 'vitest'
import { goreLobe, BAKERBOY } from '../src/renderer/avatar/bakerboy'

describe('the baker boy — 8-gore puffed crown', () => {
  it('scallops one lobe per panel around the crown', () => {
    const TAU = Math.PI * 2
    const N = 1600
    const v = Array.from({ length: N }, (_, i) => goreLobe((i / N) * TAU))
    let maxima = 0
    for (let i = 0; i < N; i++) {
      const prev = v[(i + N - 1) % N]
      const next = v[(i + 1) % N]
      if (v[i] > prev && v[i] > next) maxima++
    }
    expect(maxima).toBe(BAKERBOY.gores)
  })

  it('pinches to zero at every panel seam, peaks at 1 mid-panel', () => {
    const seamStep = (Math.PI * 2) / BAKERBOY.gores
    for (let k = 0; k < BAKERBOY.gores; k++) {
      expect(goreLobe(k * seamStep)).toBeCloseTo(0, 10)
      expect(goreLobe((k + 0.5) * seamStep)).toBeCloseTo(1, 10)
    }
  })

  it('the crown proportions read as the wide low puff', () => {
    expect(BAKERBOY.crownR).toBeGreaterThan(1.2) // overhangs the head
    expect(BAKERBOY.crownYScale).toBeLessThan(0.75) // low
    expect(BAKERBOY.puff).toBeGreaterThan(0)
    expect(BAKERBOY.puff).toBeLessThan(0.15) // a scallop, not a starburst
  })
})
