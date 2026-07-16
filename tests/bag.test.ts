import { describe, it, expect } from 'vitest'
import { bagSpec, bagPanels, bagMaterialM2, bagHardware, bagCutSheetHTML, bagPockets, bagLiningPanels, bagLiningM2 } from '../src/renderer/export/bag'

describe('handbag / tote builder', () => {
  it('a style resolves to sensible default dimensions, overridable', () => {
    const tote = bagSpec('tote')
    expect(tote.widthCm).toBeGreaterThan(0)
    expect(tote.handleDropCm).toBeGreaterThan(0)
    expect(bagSpec('clutch').handleDropCm).toBe(0) // a clutch has no handle
    expect(bagSpec('tote', { widthCm: 50 }).widthCm).toBe(50) // override
  })

  it('unwraps a body pair + a wrap gusset + handles', () => {
    const p = bagPanels(bagSpec('tote'))
    expect(p.find((x) => x.name.startsWith('Body'))!.qty).toBe(2) // front + back
    const gusset = p.find((x) => x.name.startsWith('Gusset'))!
    const spec = bagSpec('tote')
    expect(gusset.hCm).toBeCloseTo(spec.heightCm * 2 + spec.widthCm, 5) // sides + base
    expect(p.some((x) => x.name === 'Handle')).toBe(true)
    // a clutch drops the handle panel
    expect(bagPanels(bagSpec('clutch')).some((x) => x.name === 'Handle')).toBe(false)
  })

  it('material area covers every panel with waste + grows with size', () => {
    expect(bagMaterialM2(bagSpec('tote'))).toBeGreaterThan(0)
    expect(bagMaterialM2(bagSpec('tote', { widthCm: 60, heightCm: 50 }))).toBeGreaterThan(bagMaterialM2(bagSpec('tote')))
  })

  it('hardware is drawn from the strap library + fits the style', () => {
    const cross = bagHardware(bagSpec('crossbody'))
    expect(cross.some((h) => h.label.includes('snap hook') || h.label.toLowerCase().includes('hook'))).toBe(true) // detachable strap
    const clutch = bagHardware(bagSpec('clutch'))
    expect(clutch.some((h) => h.label.includes('closure'))).toBe(true)
    expect(clutch.some((h) => h.label.includes('handle'))).toBe(false) // no handle anchors
  })

  it('renders a valid cut sheet listing panels + hardware', () => {
    const html = bagCutSheetHTML(bagSpec('tote'))
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Gusset')
    expect(html).toContain('Hardware')
  })
})

describe('bag lining + pocket layout', () => {
  it('lays out a slip pocket + a secured zip pocket on opposite walls', () => {
    const p = bagPockets(bagSpec('tote'))
    expect(p.find((x) => x.type === 'slip')!.wall).toBe('front')
    const zip = p.find((x) => x.type === 'zip')!
    expect(zip.wall).toBe('back') // the secured pocket faces the body
    // pockets are sized to the bag
    expect(zip.wCm).toBeLessThan(bagSpec('tote').widthCm)
    // a clutch gets a card slip instead of a zip pocket
    expect(bagPockets(bagSpec('clutch')).some((x) => x.name === 'Card slip')).toBe(true)
    expect(bagPockets(bagSpec('clutch')).some((x) => x.type === 'zip')).toBe(false)
  })

  it('lines the body + gusset (not the handles) and totals lining material', () => {
    const lining = bagLiningPanels(bagSpec('tote'))
    expect(lining.some((p) => p.name === 'Handle')).toBe(false) // handles aren't lined
    expect(lining.some((p) => p.name.startsWith('Body'))).toBe(true)
    expect(bagLiningM2(bagSpec('tote'))).toBeGreaterThan(0)
    // a bigger bag needs more lining
    expect(bagLiningM2(bagSpec('tote', { widthCm: 60 }))).toBeGreaterThan(bagLiningM2(bagSpec('tote')))
  })

  it('the cut sheet now shows lining panels + interior pockets', () => {
    const html = bagCutSheetHTML(bagSpec('tote'))
    expect(html).toContain('Lining')
    expect(html).toContain('Interior pockets')
    expect(html).toContain('Zip pocket')
  })
})
