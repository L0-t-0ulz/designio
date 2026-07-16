import { describe, it, expect } from 'vitest'
import { shoeLast, upperPanels, upperMaterialM2, shoeSummary, shoeCutSheetHTML, soleSpecFor, treadDepthMm, soleAreaCm2, treadValue, soleSummary } from '../src/renderer/export/shoe'
import type { TreadPattern } from '../src/renderer/export/shoe'

describe('shoe last + upper designer', () => {
  it('sizes a plausible last from an EU size', () => {
    const l = shoeLast(42)
    expect(l.footLengthCm).toBeGreaterThan(24)
    expect(l.footLengthCm).toBeLessThan(28) // EU 42 ≈ 26.5 cm foot
    expect(l.footWidthCm).toBeGreaterThan(0)
    expect(l.heelToBallCm).toBeLessThan(l.footLengthCm)
    // a bigger size → a longer last
    expect(shoeLast(45).footLengthCm).toBeGreaterThan(shoeLast(40).footLengthCm)
  })

  it('unwraps the right upper panels per style', () => {
    const last = shoeLast(42)
    const oxford = upperPanels('oxford', last).map((p) => p.name)
    expect(oxford).toContain('Vamp (forepart)')
    expect(oxford).toContain('Toe cap') // oxfords have a captoe
    expect(oxford).toContain('Tongue')
    const loafer = upperPanels('loafer', last).map((p) => p.name)
    expect(loafer).not.toContain('Tongue') // a loafer is tongueless
    expect(upperPanels('boot', last).some((p) => p.name.startsWith('Shaft'))).toBe(true)
    expect(upperPanels('oxford', last).find((p) => p.name.startsWith('Quarter'))!.qty).toBe(2) // a pair
  })

  it('leather area grows with size + panel count', () => {
    expect(upperMaterialM2('boot', shoeLast(45))).toBeGreaterThan(upperMaterialM2('loafer', shoeLast(38)))
    expect(upperMaterialM2('oxford', shoeLast(42))).toBeGreaterThan(0)
  })

  it('summarises + renders a valid cut sheet incl. the sole', () => {
    expect(shoeSummary('oxford', shoeLast(42))).toContain('EU 42')
    const html = shoeCutSheetHTML('boot', shoeLast(43))
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Vamp')
    expect(html).toContain('Sole')
    expect(html).toContain('lug tread') // a boot gets a lug sole
  })
})

describe('sole & tread designer', () => {
  it('picks a sole per style — a boot lugs, a dress shoe is flat', () => {
    expect(soleSpecFor('boot').tread).toBe('lug')
    expect(soleSpecFor('oxford').tread).toBe('flat')
    expect(soleSpecFor('sneaker').outsoleMm).toBeGreaterThan(soleSpecFor('oxford').outsoleMm) // chunkier
  })

  it('tread depth: flat is smooth, lug is the deepest', () => {
    expect(treadDepthMm('flat')).toBe(0)
    expect(treadDepthMm('lug')).toBeGreaterThan(treadDepthMm('ripple'))
    expect(treadDepthMm('cup')).toBeGreaterThan(0)
  })

  it('the tread field is in [0,1], deterministic, and flat is uniformly smooth', () => {
    const patterns: TreadPattern[] = ['flat', 'lug', 'ripple', 'herringbone', 'cup']
    for (const p of patterns)
      for (const [u, v] of [[0.1, 0.2], [0.5, 0.5], [0.9, 0.77]] as const) {
        const t = treadValue(u, v, p)
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThanOrEqual(1)
        expect(treadValue(u, v, p)).toBe(t) // deterministic
      }
    expect(treadValue(0.3, 0.7, 'flat')).toBe(0) // smooth
    // a patterned tread has relief variation across the sole
    expect(treadValue(0.5, 0.1, 'ripple')).not.toBe(treadValue(0.5, 0.15, 'ripple'))
  })

  it('footprint area grows with the last; the sole summary reads sensibly', () => {
    expect(soleAreaCm2(shoeLast(45))).toBeGreaterThan(soleAreaCm2(shoeLast(38)))
    expect(soleSummary('sneaker', shoeLast(42))).toContain('cup tread')
  })
})
