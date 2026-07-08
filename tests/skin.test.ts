import { describe, it, expect } from 'vitest'
import { SKIN_LOOK, makeSkinMaterial } from '../src/renderer/avatar/skin'

const chan = (hex: number): [number, number, number] => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]

describe('default avatar skin look', () => {
  it('is a warm skin tone (red > green > blue)', () => {
    const [r, g, b] = chan(SKIN_LOOK.color)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
    expect(r).toBeGreaterThan(150) // a light-ish mid skin tone, not muddy
  })

  it('the sheen rim is warm (fakes soft subsurface at grazing angles)', () => {
    const [r, , b] = chan(SKIN_LOOK.sheenColor)
    expect(r).toBeGreaterThan(b) // warmer than it is cool
    expect(SKIN_LOOK.sheen).toBeGreaterThan(0)
  })

  it('reads semi-matte with only a whisper of self-glow', () => {
    expect(SKIN_LOOK.roughness).toBeGreaterThan(0.4)
    expect(SKIN_LOOK.roughness).toBeLessThan(0.75)
    expect(SKIN_LOOK.emissiveIntensity).toBeGreaterThan(0)
    expect(SKIN_LOOK.emissiveIntensity).toBeLessThan(0.15) // subtle, not glowing
  })

  it('builds a non-metallic sheened material', () => {
    const m = makeSkinMaterial()
    expect(m.metalness).toBe(0)
    expect(m.sheen).toBeGreaterThan(0)
    expect(m.roughness).toBeCloseTo(SKIN_LOOK.roughness, 5)
  })
})
