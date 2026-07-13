import { describe, it, expect } from 'vitest'
import { pillHeight, pillNormal } from '../src/renderer/fabric/pilling'

describe('pilling & fuzz aging', () => {
  it('zero amount is flat; more aging = more pills', () => {
    let flat = 0
    let light = 0
    let heavy = 0
    const N = 64
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const u = (i + 0.5) / N
      const v = (j + 0.5) / N
      if (pillHeight(u, v, 0) > 0) flat++
      if (pillHeight(u, v, 0.3) > 0.1) light++
      if (pillHeight(u, v, 0.9) > 0.1) heavy++
    }
    expect(flat).toBe(0)
    expect(light).toBeGreaterThan(0)
    expect(heavy).toBeGreaterThan(light * 1.5) // density rises with aging
  })

  it('tiles seamlessly and stays bounded', () => {
    for (const [u, v] of [
      [0.13, 0.37],
      [0.91, 0.08],
      [0.5, 0.99]
    ]) {
      expect(pillHeight(u, v, 0.7)).toBeCloseTo(pillHeight(u + 1, v, 0.7), 10)
      expect(pillHeight(u, v, 0.7)).toBeCloseTo(pillHeight(u, v + 1, 0.7), 10)
      const h = pillHeight(u, v, 1)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(1)
    }
  })

  it('normals are unit-length and face outward', () => {
    for (let i = 0; i < 30; i++) {
      const [nx, ny, nz] = pillNormal((i * 0.37) % 1, (i * 0.23) % 1, 0.8)
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 6)
      expect(nz).toBeGreaterThan(0)
    }
  })
})
