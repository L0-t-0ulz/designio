import { describe, it, expect } from 'vitest'
import { configuratorHtml, sizeUpcharge } from '../src/renderer/export/configurator'
import type { ListingInput } from '../src/renderer/export/listing'

const inp: ListingInput = {
  name: 'Aurora Slip Dress',
  fabricName: 'Silk charmeuse',
  fibre: '100% Silk',
  colours: [{ label: 'Blush', hex: '#e8c4c0' }, { label: 'Noir', hex: '#111111' }],
  sizes: ['XS', 'M', 'XL', 'XXL'],
  priceUsd: 189
}

describe('made-to-order configurator', () => {
  it('sizeUpcharge: base sizes free, plus sizes cost more', () => {
    expect(sizeUpcharge('M')).toBe(0)
    expect(sizeUpcharge('xl')).toBe(8)
    expect(sizeUpcharge('XXL')).toBe(14)
    expect(sizeUpcharge('3XL')).toBe(20)
  })

  it('renders a full doc with option buttons carrying value + upcharge data', () => {
    const html = configuratorHtml(inp)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('made to order')
    expect((html.match(/class="opt sw/g) || []).length).toBe(2)
    expect((html.match(/class="opt size/g) || []).length).toBe(4)
    expect(html).toContain('data-up="8"') // XL upcharge encoded on the button
    expect(html).toContain('data-v="Blush"')
  })

  it('embeds the base price + email + share link into the page data', () => {
    const html = configuratorHtml(inp, { email: 'sales@brand.co', shareUrl: 'https://app/#share=XYZ' })
    expect(html).toContain('189') // base price
    expect(html).toContain('sales@brand.co')
    expect(html).toContain('https://app/#share=XYZ')
  })

  it('has the interactive CTA + render script', () => {
    const html = configuratorHtml(inp)
    expect(html).toContain('id="cta"')
    expect(html).toContain('mailto:')
    expect(html).toContain('function render()')
  })

  it('defaults to one colour + one size for an empty design', () => {
    const html = configuratorHtml({ ...inp, colours: [], sizes: [] })
    expect((html.match(/class="opt sw/g) || []).length).toBe(1)
    expect(html).toContain('One size')
  })
})
