import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { harmonies } from '../src/renderer/fabric/harmony'

const hue = (hex: number): number => {
  const hsl = { h: 0, s: 0, l: 0 }
  new THREE.Color(hex).getHSL(hsl)
  return hsl.h
}
const hueDist = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 1
  return Math.min(d, 1 - d) * 360
}

describe('colour harmonies', () => {
  it('rotates hues by the classic wheel offsets', () => {
    const base = 0x2266cc // a saturated mid blue
    const [comp, ana, tri] = harmonies(base)
    expect(comp.name).toBe('Complementary')
    expect(hueDist(hue(base), hue(comp.colors[0]))).toBeCloseTo(180, 0)
    expect(ana.colors.length).toBe(2)
    for (const c of ana.colors) expect(hueDist(hue(base), hue(c))).toBeCloseTo(30, 0)
    for (const c of tri.colors) expect(hueDist(hue(base), hue(c))).toBeCloseTo(120, 0)
  })

  it('keeps colours readable even from near-grey or extreme bases', () => {
    for (const base of [0x111111, 0xfefefe, 0x808080]) {
      for (const scheme of harmonies(base)) {
        for (const c of scheme.colors) {
          const hsl = { h: 0, s: 0, l: 0 }
          new THREE.Color(c).getHSL(hsl)
          expect(hsl.s).toBeGreaterThanOrEqual(0.24) // clamped saturation floor
          expect(hsl.l).toBeGreaterThanOrEqual(0.29)
          expect(hsl.l).toBeLessThanOrEqual(0.69)
        }
      }
    }
  })
})
