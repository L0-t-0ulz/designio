import { describe, it, expect } from 'vitest'
import { WALK_STYLES, WALK_STYLE_NAMES, getWalkStyle } from '../src/renderer/avatar/walkStyles'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

describe('walk-cycle library', () => {
  it('commercial matches the historical walk exactly (byte-compat default)', () => {
    const c = getWalkStyle('commercial')!
    expect(c).toEqual({ name: 'commercial', label: 'Commercial', legAmp: 0.5, armAmp: 0.35, freq: 3.0, rate: 1 })
    expect(WALK_STYLE_NAMES).toEqual(['commercial', 'editorial', 'sport'])
  })

  it('the styles read differently: editorial glides long+slow, sport drives quick+punchy', () => {
    const e = getWalkStyle('editorial')!
    const c = getWalkStyle('commercial')!
    const sp = getWalkStyle('sport')!
    expect(e.legAmp).toBeGreaterThan(c.legAmp) // longer stride
    expect(e.freq).toBeLessThan(c.freq) // slower cadence
    expect(e.armAmp).toBeLessThan(c.armAmp) // quiet arms
    expect(sp.freq).toBeGreaterThan(c.freq) // quick
    expect(sp.armAmp).toBeGreaterThan(c.armAmp) // driving arms
    expect(sp.rate).toBeGreaterThan(e.rate)
    expect(WALK_STYLES.length).toBe(3)
  })

  it('the procedural body actually swings by the style: editorial stride > sport stride', () => {
    const maxFootSwing = (style: 'editorial' | 'sport'): number => {
      const mann = buildMannequin()
      mann.setWalkStyle(style)
      let max = 0
      for (let i = 1; i <= 40; i++) {
        mann.update(i * 0.05, 'walk', 1) // sweep ~2 s of the cycle
        max = Math.max(max, Math.abs(mann.colliders[8].b.z)) // left shin foot end
      }
      return max
    }
    const editorial = maxFootSwing('editorial')
    const sport = maxFootSwing('sport')
    expect(editorial).toBeGreaterThan(sport) // legAmp 0.6 vs 0.45 → longer stride
    expect(sport).toBeGreaterThan(0.05) // …but sport genuinely walks too
  })
})
