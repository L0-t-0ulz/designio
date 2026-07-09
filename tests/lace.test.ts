import { describe, it, expect } from 'vitest'
import { laceAlpha, scallopValue, LACE_PATTERNS } from '../src/renderer/fabric/lace'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc } from '../src/renderer/studio/document'

const stats = (p: (typeof LACE_PATTERNS)[number]): { holes: number; thread: number; total: number } => {
  let holes = 0
  let thread = 0
  const N = 40
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const a = laceAlpha(p, x / N, y / N)
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThanOrEqual(1)
      if (a < 0.5) holes++
      else thread++
    }
  return { holes, thread, total: N * N }
}

describe('lace / broderie alpha-cutout', () => {
  it('every pattern is genuinely see-through — real holes AND real thread', () => {
    for (const p of LACE_PATTERNS) {
      const s = stats(p)
      expect(s.holes).toBeGreaterThan(s.total * 0.15) // meaningfully open (sheer)
      expect(s.thread).toBeGreaterThan(s.total * 0.15) // but still has structure
    }
  })

  it('the alpha field is periodic (tiles seamlessly)', () => {
    for (const p of LACE_PATTERNS) {
      expect(laceAlpha(p, 0.23, 0.71)).toBeCloseTo(laceAlpha(p, 1.23, 2.71), 10)
    }
  })

  it('the scallop profile is 0 at the cusps and peaks between them', () => {
    expect(scallopValue(0, 6)).toBeCloseTo(0, 10) // cusp
    expect(scallopValue(1 / 6, 6)).toBeCloseTo(0, 10) // next cusp
    expect(scallopValue(0.5 / 6, 6)).toBeCloseTo(1, 6) // crest between them
  })

  it('lace round-trips through save/parse and cloneLayer deep-copies it', () => {
    const c = defaultConfig()
    c.lace = 'chantilly'
    expect(parseDoc(serializeDoc(docFromConfig(c))).layers[0].lace).toBe('chantilly')

    const base = defaultLayer('gown')
    base.lace = 'fishnet'
    const copy = cloneLayer(base)
    copy.lace = 'geometric'
    expect(base.lace).toBe('fishnet') // original untouched
  })
})
