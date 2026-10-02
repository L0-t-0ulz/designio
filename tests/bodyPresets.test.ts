import { describe, it, expect } from 'vitest'
import { BODY_PRESETS, BODY_PRESET_NAMES, getBodyPreset, applyBodyPreset } from '../src/renderer/avatar/bodyPresets'
import { DEFAULT_BODY } from '../src/renderer/avatar/Mannequin'

// The mannequin's valid shaping range (matches the Avatar sliders).
const HEIGHT: [number, number] = [0.85, 1.15]
const GIRTH: [number, number] = [0.78, 1.3]

describe('body-shape presets', () => {
  it('exposes a diverse set beyond the two runway figures', () => {
    expect(BODY_PRESET_NAMES).toEqual([
      'runway', 'curvy', 'plus', 'athletic', 'petite', 'tall', 'unisex',
      'pear', 'apple', 'inverted-triangle', 'rectangle'
    ])
  })

  it('every preset stays inside the sliders valid range (→ valid colliders)', () => {
    for (const p of BODY_PRESETS) {
      expect(p.shape.height).toBeGreaterThanOrEqual(HEIGHT[0])
      expect(p.shape.height).toBeLessThanOrEqual(HEIGHT[1])
      for (const k of ['build', 'bust', 'waist', 'hips'] as const) {
        expect(p.shape[k]).toBeGreaterThanOrEqual(GIRTH[0])
        expect(p.shape[k]).toBeLessThanOrEqual(GIRTH[1])
      }
    }
  })

  it('applyBodyPreset sets the shape but keeps the figure (bodyType)', () => {
    const male = { ...DEFAULT_BODY, bodyType: 'male' as const }
    const out = applyBodyPreset(male, getBodyPreset('plus')!)
    expect(out.bodyType).toBe('male') // athletic/plus works on either figure
    expect(out.build).toBe(1.2)
    expect(out.hips).toBe(1.18)
  })

  it('the presets are actually distinct shapes', () => {
    const sig = (n: string): string => JSON.stringify(getBodyPreset(n)!.shape)
    const sigs = new Set(BODY_PRESET_NAMES.map(sig))
    expect(sigs.size).toBe(BODY_PRESET_NAMES.length)
    // petite is shorter than tall; plus is heavier-build than runway
    expect(getBodyPreset('petite')!.shape.height).toBeLessThan(getBodyPreset('tall')!.shape.height)
    expect(getBodyPreset('plus')!.shape.build).toBeGreaterThan(getBodyPreset('runway')!.shape.build)
    // curvy nips the waist and widens the hips
    expect(getBodyPreset('curvy')!.shape.waist).toBeLessThan(getBodyPreset('curvy')!.shape.hips)
    // unisex is a straighter, less-gendered block: a flatter chest + a less-nipped
    // (straighter) waist than the curvy figure
    const uni = getBodyPreset('unisex')!.shape
    expect(uni.bust).toBeLessThan(getBodyPreset('curvy')!.shape.bust)
    expect(uni.waist).toBeGreaterThan(uni.hips) // waist not nipped in below the hips — a rectangle
    const pear = getBodyPreset('pear')!.shape
    expect(pear.hips).toBeGreaterThan(pear.waist)
    expect(pear.waist).toBeGreaterThan(pear.bust)
    const apple = getBodyPreset('apple')!.shape
    expect(apple.waist).toBeGreaterThan(apple.bust)
    expect(apple.bust).toBeGreaterThan(apple.hips)
    const inv = getBodyPreset('inverted-triangle')!.shape
    expect(inv.bust).toBeGreaterThan(inv.waist)
    expect(inv.waist).toBeGreaterThan(inv.hips)
    const rect = getBodyPreset('rectangle')!.shape
    expect(Math.abs(rect.bust - rect.waist)).toBeLessThan(0.05)
    expect(Math.abs(rect.waist - rect.hips)).toBeLessThan(0.05)
  })

  it('runway is the neutral 1.0 body', () => {
    expect(getBodyPreset('runway')!.shape).toEqual({ height: 1, build: 1, bust: 1, waist: 1, hips: 1 })
  })
})
