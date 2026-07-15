import { describe, it, expect } from 'vitest'
import { getGarment, GARMENT_IDS } from '../src/renderer/garments/registry'

describe('hijab style set', () => {
  it('registers the al-amira hijab and the khimar as headwear', () => {
    expect(GARMENT_IDS).toContain('hijab')
    expect(GARMENT_IDS).toContain('khimar')
    for (const id of ['hijab', 'khimar']) {
      const g = getGarment(id)
      expect(g.category).toBe('outerwear')
      expect(g.pieces).toHaveLength(1)
    }
  })

  it('both frame the face — a crown-anchored head tube with an open-face cut-out', () => {
    for (const id of ['hijab', 'khimar']) {
      const p = getGarment(id).pieces[0] as { kind: string; anchor?: string; face?: string }
      expect(p.kind).toBe('headTube')
      expect(p.anchor).toBe('crown')
      expect(p.face).toBe('open-face') // the face is left open, not covered
    }
  })

  it('the khimar drapes longer + wider than the fitted al-amira hijab', () => {
    const hijab = getGarment('hijab').pieces[0] as { dropLo: number; botScale: number }
    const khimar = getGarment('khimar').pieces[0] as { dropLo: number; botScale: number }
    expect(khimar.dropLo).toBeGreaterThan(hijab.dropLo) // hangs to mid-torso vs the shoulders
    expect(khimar.botScale).toBeGreaterThan(hijab.botScale) // capes wider over the shoulders
  })
})
