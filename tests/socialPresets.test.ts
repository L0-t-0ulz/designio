import { describe, it, expect } from 'vitest'
import { SOCIAL_PRESETS, cropRect } from '../src/renderer/studio/socialPresets'

describe('social video presets', () => {
  it('exposes native + the three platform frames', () => {
    expect(SOCIAL_PRESETS.map((p) => p.name)).toEqual(['native', 'reel', 'square', 'portrait'])
    expect(SOCIAL_PRESETS[0].aspect).toBeNull()
    expect(SOCIAL_PRESETS[1].aspect).toEqual({ w: 9, h: 16 })
  })

  it('centre-crops a landscape canvas to 9:16 — full height, trimmed sides', () => {
    const c = cropRect(1920, 1080, 9, 16)
    expect(c.h).toBe(1080)
    expect(c.w).toBe(Math.floor((1080 * 9) / 16 / 2) * 2) // 606
    expect(c.x).toBe(Math.floor((1920 - c.w) / 2))
    expect(c.y).toBe(0)
  })

  it('centre-crops a portrait canvas to 1:1 — full width, trimmed top/bottom', () => {
    const c = cropRect(800, 1400, 1, 1)
    expect(c.w).toBe(800)
    expect(c.h).toBe(800)
    expect(c.y).toBe(300)
    expect(c.x).toBe(0)
  })

  it('always returns even dimensions inside the source (encoders want them)', () => {
    for (const [sw, sh, aw, ah] of [
      [1919, 1077, 9, 16],
      [333, 777, 4, 5],
      [100, 100, 16, 9],
      [3, 3, 1, 1]
    ]) {
      const c = cropRect(sw, sh, aw, ah)
      expect(c.w % 2).toBe(0)
      expect(c.h % 2).toBe(0)
      expect(c.w).toBeGreaterThanOrEqual(2)
      expect(c.h).toBeGreaterThanOrEqual(2)
      expect(c.x + c.w).toBeLessThanOrEqual(sw)
      expect(c.y + c.h).toBeLessThanOrEqual(sh)
    }
  })
})
