import { describe, it, expect } from 'vitest'
import { lineSheetHTML, suggestedPrices, type LineSheetItem } from '../src/renderer/export/lineSheet'

const item: LineSheetItem = {
  name: 'Slip dress',
  styleRef: 'SS26-014',
  hero: 'data:image/png;base64,AAA',
  fabricName: 'Silk charmeuse',
  fibre: '100% silk',
  sizes: ['XS', 'S', 'M', 'L'],
  colourways: [
    { hex: '#8a1538', label: 'TR-1204 Garnet' },
    { hex: '#1a1a22', label: 'TR-9001 Ink' }
  ],
  specs: [
    { label: 'Chest', cm: 92.4 },
    { label: 'Length', cm: 108 }
  ],
  landedCost: 23.5,
  care: ['Hand wash cold', 'Do not bleach']
}

describe('line sheet (wholesale one-pager)', () => {
  it('keystone pricing: wholesale 2×, retail 2.2× wholesale, cents-rounded, never negative', () => {
    expect(suggestedPrices(23.5)).toEqual({ wholesale: 47, retail: 103.4 })
    expect(suggestedPrices(10.333)).toEqual({ wholesale: 20.67, retail: 45.47 })
    expect(suggestedPrices(-5)).toEqual({ wholesale: 0, retail: 0 })
  })

  it('renders every section: hero, swatches, sizes, specs, pricing, care', () => {
    const html = lineSheetHTML(item)
    expect(html).toContain('Slip dress')
    expect(html).toContain('SS26-014')
    expect(html).toContain('data:image/png;base64,AAA')
    expect(html).toContain('background:#8a1538')
    expect(html).toContain('TR-9001 Ink')
    for (const s of item.sizes) expect(html).toContain(`>${s}</span>`)
    expect(html).toContain('92.4 cm')
    expect(html).toContain('$23.50')
    expect(html).toContain('$47.00') // wholesale
    expect(html).toContain('$103.40') // retail
    expect(html).toContain('Hand wash cold')
    expect(html).toContain('@page') // print CSS
  })

  it('escapes untrusted strings (no HTML injection)', () => {
    const html = lineSheetHTML({ ...item, name: '<img onerror=x>', care: ['<script>'] })
    expect(html).not.toContain('<img onerror')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;img onerror')
  })
})
