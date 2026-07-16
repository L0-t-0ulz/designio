import { describe, it, expect } from 'vitest'
import { shoeLast, upperPanels, upperMaterialM2, shoeSummary, shoeCutSheetHTML } from '../src/renderer/export/shoe'

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

  it('summarises + renders a valid cut sheet', () => {
    expect(shoeSummary('oxford', shoeLast(42))).toContain('EU 42')
    const html = shoeCutSheetHTML('oxford', shoeLast(42))
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Vamp')
    expect(html).toContain('Upper leather')
  })
})
