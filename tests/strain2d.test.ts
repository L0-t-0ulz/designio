import { describe, it, expect } from 'vitest'
import { strainTint, strainToColor } from '../src/renderer/fabric/heatmap'
import { panelsToSVG, garmentToPanels } from '../src/renderer/export/garmentPattern'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

describe('strain on the 2D pattern', () => {
  it('strainTint softens the heat colour toward pattern paper and stays a valid hex', () => {
    for (const v of [-0.2, 0, 0.05, 0.2]) {
      const tint = strainTint(v)
      expect(tint).toMatch(/^#[0-9a-f]{6}$/)
      // softened: every channel pulled toward the paper vs the raw heat colour
      const raw = strainToColor(v)
      const ch = (i: number): number => parseInt(tint.slice(1 + i * 2, 3 + i * 2), 16) / 255
      for (let i = 0; i < 3; i++) {
        const paper = [0.956, 0.949, 0.933][i]
        const expected = raw[i] * 0.45 + paper * 0.55
        expect(ch(i)).toBeCloseTo(expected, 1)
      }
    }
    // tight reads warmer than slack even after softening
    const tightR = parseInt(strainTint(0.2).slice(1, 3), 16)
    const slackR = parseInt(strainTint(-0.2).slice(1, 3), 16)
    expect(tightR).toBeGreaterThan(slackR)
  })

  it('panelsToSVG paints the tints on the named panels and carries the note', () => {
    const mann = buildMannequin()
    const res = garmentToPanels(getGarment('dress'), gradeParams(defaultLayer('dress')), mann.measurements, mann.colliders)
    const svg = panelsToSVG(res, { tints: { Front: '#e0b0a0' }, tintNote: 'panel tint = live strain' })
    expect(svg).toContain('fill="#e0b0a0"')
    expect(svg).toContain('fill="#f4f2ee"') // untinted panels keep the paper
    expect(svg).toContain('panel tint = live strain')
    const plain = panelsToSVG(res)
    expect(plain).not.toContain('#e0b0a0')
    expect(plain).not.toContain('panel tint')
  })
})
