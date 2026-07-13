import { describe, it, expect } from 'vitest'
import { topEdge, type TubeSpec } from '../src/renderer/cloth/Garment'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

const spec: TubeSpec = {
  rings: 8,
  radial: 16,
  topY: 1.35,
  bottomY: 0.9,
  radiusTop: 0.15,
  radiusBottom: 0.18,
  neckline: 'one-shoulder',
  shoulderY: 1.42
}

describe('asymmetric fit — one-shoulder neckline', () => {
  it('keeps the left strap at the shoulder and sweeps below the right armpit', () => {
    const left = topEdge(spec, Math.PI) // −x: the strap side
    const right = topEdge(spec, 0) // +x: the open side
    expect(left).toBeCloseTo(1.42, 3) // at the shoulder
    expect(right).toBeLessThan(1.42 - 0.15) // dropped well below the armpit
    // and it is genuinely asymmetric (unlike every other neckline)
    expect(topEdge(spec, Math.PI / 4)).not.toBeCloseTo(topEdge(spec, (3 * Math.PI) / 4), 3)
    const scoop: TubeSpec = { ...spec, neckline: 'scoop' }
    expect(topEdge(scoop, Math.PI / 4)).toBeCloseTo(topEdge(scoop, (3 * Math.PI) / 4), 10) // symmetric control
  })

  it('the flat pattern goes asymmetric with it (mirror symmetry breaks on the front panel)', () => {
    const mann = buildMannequin()
    const sym = garmentToPanels(getGarment('dress'), gradeParams(defaultLayer('dress')), mann.measurements, mann.colliders)
    const asym = garmentToPanels(getGarment('dress'), gradeParams({ ...defaultLayer('dress'), neckline: 'one-shoulder' }), mann.measurements, mann.colliders)
    const mirrorError = (pts: { x: number; y: number }[]): number => {
      // reflect about the panel's mid-x and measure the worst outline mismatch
      const midX = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2
      let worst = 0
      for (const p of pts) {
        const rx = 2 * midX - p.x
        let best = Infinity
        for (const q of pts) best = Math.min(best, Math.hypot(q.x - rx, q.y - p.y))
        worst = Math.max(worst, best)
      }
      return worst
    }
    const front = (r: typeof sym) => r.panels.find((p) => /^Front/.test(p.name))!.outline
    expect(mirrorError(front(sym))).toBeLessThan(3) // the scoop bodice is mirror-symmetric (≤ 3 mm)
    expect(mirrorError(front(asym))).toBeGreaterThan(15) // one-shoulder breaks the mirror hard
  })
})
