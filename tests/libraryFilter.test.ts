import { describe, it, expect } from 'vitest'
import { matchesFabric, weightBucket, stretchBucket, EMPTY_FILTER, type FabricFilter } from '../src/renderer/shell/libraryFilter'
import { FABRIC_LIBRARY, getFabric } from '../src/renderer/fabric/FabricLibrary'

const filter = (over: Partial<FabricFilter>): FabricFilter => ({ ...EMPTY_FILTER, ...over })

describe('library fabric filters', () => {
  it('buckets weight by gsm and stretch by stretchiness', () => {
    expect(weightBucket(getFabric('chiffon').gsm)).toBe('light') // 45
    expect(weightBucket(getFabric('chino-twill').gsm)).toBe('medium') // 260
    expect(weightBucket(getFabric('denim').gsm)).toBe('heavy') // 380
    expect(stretchBucket(getFabric('denim').stretch)).toBe('rigid') // 0.02
    expect(stretchBucket(getFabric('jersey-knit').stretch)).toBe('stretch') // 0.75
  })

  it('the empty filter passes every fabric', () => {
    for (const f of FABRIC_LIBRARY) expect(matchesFabric(f, EMPTY_FILTER)).toBe(true)
  })

  it('filters by family', () => {
    const knitsOnly = FABRIC_LIBRARY.filter((f) => matchesFabric(f, filter({ family: 'knit' })))
    expect(knitsOnly.length).toBeGreaterThan(0)
    expect(knitsOnly.every((f) => f.family === 'knit')).toBe(true)
  })

  it('filters by weight and stretch, combining constraints (AND)', () => {
    expect(matchesFabric(getFabric('denim'), filter({ weight: 'heavy' }))).toBe(true)
    expect(matchesFabric(getFabric('denim'), filter({ weight: 'light' }))).toBe(false)
    // heavy + stretch → a heavy knit (cable-knit 400 gsm, 0.55 stretch) passes, denim doesn't
    const heavyStretch = filter({ weight: 'heavy', stretch: 'stretch' })
    expect(matchesFabric(getFabric('cable-knit'), heavyStretch)).toBe(true)
    expect(matchesFabric(getFabric('denim'), heavyStretch)).toBe(false) // heavy but rigid
  })

  it('the text query still matches the name (case-insensitive)', () => {
    expect(matchesFabric(getFabric('silk-charmeuse'), filter({ query: 'silk' }))).toBe(true)
    expect(matchesFabric(getFabric('denim'), filter({ query: 'silk' }))).toBe(false)
  })
})
