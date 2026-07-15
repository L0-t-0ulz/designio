import { describe, it, expect } from 'vitest'
import { tryOnWidgetHtml, tryOnEmbedSnippet } from '../src/renderer/export/tryOn'
import type { ListingInput } from '../src/renderer/export/listing'

const inp: ListingInput = {
  name: 'Aurora <Gown>',
  fabricName: 'Silk charmeuse',
  fibre: '100% silk',
  colours: [
    { label: 'Blush', hex: '#d98ca8' },
    { label: 'Ink', hex: '#14141a' }
  ],
  sizes: ['S', 'M', 'L'],
  priceUsd: 248
}
const HERO = 'data:image/png;base64,AAAA'

describe('virtual try-on widget', () => {
  it('renders a widget with one swatch per colourway and the hero image', () => {
    const html = tryOnWidgetHtml(inp, HERO)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain(`src="${HERO}"`)
    // exactly one swatch button per colourway (class="sw" or class="sw on")
    const sw = html.match(/class="sw(?: on)?"/g) ?? []
    expect(sw.length).toBe(2)
    expect(html).toContain('$248.00')
    // the first colourway is pre-selected + named
    expect(html).toContain('class="sw on"')
    expect(html).toContain('>Blush</div>')
  })

  it('escapes user text so a stray < in the name can\'t break the markup', () => {
    const html = tryOnWidgetHtml(inp, HERO)
    expect(html).toContain('Aurora &lt;Gown&gt;')
    expect(html).not.toContain('Aurora <Gown>')
  })

  it('offers AR with rel="ar" when a model URL is given', () => {
    const html = tryOnWidgetHtml(inp, HERO, { arUrl: 'https://x/y.usdz', shareUrl: 'https://x/s' })
    expect(html).toContain('View on you (AR)')
    expect(html).toContain('rel="ar"')
    expect(html).toContain('href="https://x/y.usdz"')
  })

  it('falls back to a 3D share link when there is no AR model', () => {
    const html = tryOnWidgetHtml(inp, HERO, { shareUrl: 'https://x/s' })
    expect(html).toContain('View in 3D')
    expect(html).toContain('href="https://x/s"')
    expect(html).not.toContain('rel="ar"')
  })

  it('omits the button entirely with no AR and no share link', () => {
    const html = tryOnWidgetHtml(inp, HERO)
    expect(html).not.toContain('class="cta"')
  })

  it('the embed snippet is an iframe with the widget URL and default size', () => {
    const snip = tryOnEmbedSnippet('https://shop/w.html')
    expect(snip).toContain('<iframe')
    expect(snip).toContain('src="https://shop/w.html"')
    expect(snip).toContain('width="340"')
    expect(snip).toContain('height="560"')
    expect(tryOnEmbedSnippet('https://shop/w.html', { width: 400, height: 600 })).toContain('width="400"')
  })
})
