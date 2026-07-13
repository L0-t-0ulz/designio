import { describe, it, expect } from 'vitest'
import {
  SEAM_TYPES,
  THREAD_WEIGHTS,
  DEFAULT_STITCH,
  clampSpi,
  stitchLengthMm,
  dashForSpi,
  threadMetresFor,
  stitchSummary,
  parseStitchParams,
  type StitchSpec
} from '../src/renderer/garment/stitchTypes'

describe('stitch math', () => {
  it('stitch length is 25.4/SPI, clamped to a sane machine range', () => {
    expect(stitchLengthMm(10)).toBeCloseTo(2.54, 6)
    expect(stitchLengthMm(12.7)).toBeCloseTo(25.4 / 13, 6) // rounds to whole stitches
    expect(clampSpi(0)).toBe(10) // garbage → default
    expect(clampSpi(100)).toBe(22)
    expect(clampSpi(1)).toBe(4)
  })

  it('dash pitch sums to the real stitch length and shrinks with SPI', () => {
    const coarse = dashForSpi(6)
    const fine = dashForSpi(14)
    expect(coarse.dashSize + coarse.gapSize).toBeCloseTo(25.4 / 6 / 1000, 9)
    expect(fine.dashSize + fine.gapSize).toBeCloseTo(25.4 / 14 / 1000, 9)
    expect(fine.dashSize).toBeLessThan(coarse.dashSize)
  })
})

describe('thread estimate', () => {
  const base: StitchSpec = { ...DEFAULT_STITCH }

  it('scales with the seam type appetite (loopers devour thread)', () => {
    const plain = threadMetresFor(300, { ...base, seamType: 'plain' })
    const french = threadMetresFor(300, { ...base, seamType: 'french' })
    const overlock = threadMetresFor(300, { ...base, seamType: 'overlock' })
    expect(french).toBeGreaterThan(plain)
    expect(overlock).toBeGreaterThan(french)
    // plain lockstitch at 10 SPI = the classic ~2.5× seam length
    expect(plain).toBeCloseTo(3 * 2.5, 5)
  })

  it('denser stitching and a double needle consume more', () => {
    expect(threadMetresFor(300, { ...base, spi: 14 })).toBeGreaterThan(threadMetresFor(300, { ...base, spi: 8 }))
    expect(threadMetresFor(300, { ...base, needle: 'double' })).toBeCloseTo(threadMetresFor(300, base) * 1.4, 6)
  })
})

describe('library data', () => {
  it('every seam type carries allowance, factor, rows and a note', () => {
    for (const spec of Object.values(SEAM_TYPES)) {
      expect(spec.allowanceMm).toBeGreaterThanOrEqual(8)
      expect(spec.threadFactor).toBeGreaterThan(1)
      expect([0, 1, 2]).toContain(spec.visibleRows)
      expect(spec.note.length).toBeGreaterThan(0)
    }
    // enclosed/folded seams need more allowance than plain
    expect(SEAM_TYPES.french.allowanceMm).toBeGreaterThan(SEAM_TYPES.plain.allowanceMm)
    expect(SEAM_TYPES['flat-fell'].allowanceMm).toBeGreaterThan(SEAM_TYPES.plain.allowanceMm)
    // flat-fell is the twin-row jeans seam
    expect(SEAM_TYPES['flat-fell'].visibleRows).toBe(2)
    expect(Object.keys(THREAD_WEIGHTS)).toHaveLength(3)
  })

  it('summarises a spec into one tech-pack line', () => {
    const s = stitchSummary({ seamType: 'flat-fell', needle: 'double', spi: 8, threadWt: 'tex-60' })
    expect(s).toContain('Flat-fell')
    expect(s).toContain('8 SPI')
    expect(s).toContain('3.2 mm')
    expect(s).toContain('double needle')
    expect(s).toContain('Tex 60')
  })
})

describe('parseStitchParams', () => {
  it('returns undefined when no stitch params are present', () => {
    expect(parseStitchParams(() => null)).toBeUndefined()
  })

  it('fills unspecified fields from defaults and rejects junk', () => {
    const get = (k: string): string | null => (k === 'seamType' ? 'flat-fell' : k === 'spi' ? '99' : null)
    const spec = parseStitchParams(get)!
    expect(spec.seamType).toBe('flat-fell')
    expect(spec.spi).toBe(22) // clamped
    expect(spec.needle).toBe('single')
    expect(spec.threadWt).toBe('tex-40')
    const junk = parseStitchParams((k) => (k === 'seamType' ? 'zigzag' : null))!
    expect(junk.seamType).toBe('plain')
  })
})
