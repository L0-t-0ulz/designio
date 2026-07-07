import { describe, it, expect } from 'vitest'
import { pleatWave } from '../src/renderer/cloth/Garment'
import { PLEAT_STYLES } from '../src/renderer/garment/templates'

const TAU = Math.PI * 2

describe('pleatWave (the pleats & gathers library)', () => {
  it('every style stays within a bounded fold amplitude', () => {
    for (const style of PLEAT_STYLES) {
      for (let i = 0; i < 200; i++) {
        const v = pleatWave((i / 200) * TAU, style)
        expect(v).toBeGreaterThanOrEqual(-1.001)
        expect(v).toBeLessThanOrEqual(1.001)
      }
    }
  })

  it('box pleats are a crisp square wave (flat out / flat in)', () => {
    for (let i = 0; i < 100; i++) {
      const v = pleatWave((i / 100) * TAU, 'box')
      expect(Math.abs(Math.abs(v) - 1)).toBeLessThan(1e-9) // always ±1
    }
  })

  it('the styles are actually distinct (not all the same wave)', () => {
    const a = 0.35
    const vals = PLEAT_STYLES.map((s) => pleatWave(a, s))
    expect(new Set(vals.map((v) => v.toFixed(4))).size).toBeGreaterThan(1)
  })

  it('folds are periodic — averages ~0 over a full turn (adds fullness, not net radius)', () => {
    for (const style of PLEAT_STYLES) {
      let sum = 0
      const N = 600
      for (let i = 0; i < N; i++) sum += pleatWave((i / N) * TAU, style)
      expect(Math.abs(sum / N)).toBeLessThan(0.05)
    }
  })
})
