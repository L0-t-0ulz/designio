import { describe, it, expect } from 'vitest'
import { figureBlockGrade, applyFigureBlockToConfig, FIGURE_BLOCKS } from '../src/renderer/studio/figureBlock'

describe('petite / tall / plus auto-proportioning', () => {
  it('petite shortens, tall lengthens, plus adds ease', () => {
    expect(figureBlockGrade('petite').lengthScale).toBeLessThan(1)
    expect(figureBlockGrade('tall').lengthScale).toBeGreaterThan(1)
    expect(figureBlockGrade('plus').easeAddM).toBeGreaterThan(0)
    expect(figureBlockGrade('regular').lengthScale).toBe(1)
    expect(figureBlockGrade('regular').easeAddM).toBe(0)
  })

  it('names the matching body preset (except regular)', () => {
    expect(figureBlockGrade('petite').bodyPreset).toBe('petite')
    expect(figureBlockGrade('plus').bodyPreset).toBe('plus')
    expect(figureBlockGrade('regular').bodyPreset).toBeUndefined()
  })

  it('proportions a config: petite shorter, tall longer, plus roomier', () => {
    const petite = { length: 0.6, ease: 0.02 }
    applyFigureBlockToConfig(petite, 'petite')
    expect(petite.length).toBeLessThan(0.6)

    const tall = { length: 0.6, ease: 0.02 }
    applyFigureBlockToConfig(tall, 'tall')
    expect(tall.length).toBeGreaterThan(0.6)

    const plus = { length: 0.6, ease: 0.02 }
    applyFigureBlockToConfig(plus, 'plus')
    expect(plus.ease).toBeGreaterThan(0.02)
  })

  it('keeps ease within the valid range', () => {
    const c = { length: 0.6, ease: 0.11 }
    applyFigureBlockToConfig(c, 'plus')
    expect(c.ease).toBeLessThanOrEqual(0.12) // clamped
    expect(FIGURE_BLOCKS).toContain('regular')
  })
})
