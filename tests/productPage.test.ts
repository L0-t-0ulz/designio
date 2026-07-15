import { describe, it, expect } from 'vitest'
import { productPageHtml } from '../src/renderer/export/productPage'
import type { ListingInput } from '../src/renderer/export/listing'

const inp: ListingInput = {
  name: 'Aurora Slip Dress',
  fabricName: 'Silk charmeuse',
  fibre: '100% Silk',
  colours: [{ label: 'Blush', hex: '#e8c4c0' }, { label: 'Noir', hex: '#111111' }],
  sizes: ['XS', 'S', 'M'],
  priceUsd: 189,
  careLines: ['Hand wash cold']
}

describe('storefront product page export', () => {
  it('renders a full HTML doc with name, price, fabric', () => {
    const html = productPageHtml(inp)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('Aurora Slip Dress')
    expect(html).toContain('$189.00')
    expect(html).toContain('Silk charmeuse')
    expect(html).toContain('Add to cart')
  })

  it('renders a swatch per colour and a button per size', () => {
    const html = productPageHtml(inp)
    expect((html.match(/class="sw/g) || []).length).toBe(2)
    expect((html.match(/class="size/g) || []).length).toBe(3)
    expect(html).toContain('#e8c4c0')
    expect(html).toContain('>XS<')
  })

  it('embeds the hero image when given, else a placeholder', () => {
    expect(productPageHtml(inp, 'data:image/png;base64,AAAA')).toContain('src="data:image/png;base64,AAAA"')
    expect(productPageHtml(inp)).toContain('placeholder')
  })

  it('escapes HTML-unsafe text', () => {
    const html = productPageHtml({ ...inp, name: 'Dress <script>', description: 'a & b' })
    expect(html).toContain('Dress &lt;script&gt;')
    expect(html).toContain('a &amp; b')
    expect(html).not.toContain('<script>')
  })

  it('defaults to one swatch + one size for an empty design', () => {
    const html = productPageHtml({ ...inp, colours: [], sizes: [] })
    expect((html.match(/class="sw/g) || []).length).toBe(1)
    expect(html).toContain('One size')
  })
})
