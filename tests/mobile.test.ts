import { describe, it, expect } from 'vitest'
import { mobileCompanionHTML } from '../src/renderer/export/mobile'
import type { ListingInput } from '../src/renderer/export/listing'

const inp: ListingInput = {
  name: 'Aurora Gown',
  fabricName: 'Silk charmeuse',
  fibre: '100% silk',
  colours: [
    { label: 'Blush', hex: '#d98ca8' },
    { label: 'Ink', hex: '#14141a' }
  ],
  sizes: ['S', 'M', 'L'],
  priceUsd: 248,
  careLines: ['Dry clean only']
}
const HERO = 'data:image/png;base64,AAAA'

describe('mobile companion', () => {
  it('is an installable PWA — manifest + apple meta + theme colour', () => {
    const html = mobileCompanionHTML(inp, HERO)
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(html).toContain('theme-color')
    expect(html).toContain('viewport-fit=cover') // full-bleed on notched phones
  })

  it('shows the hero, a dot per colourway, sizes + price', () => {
    const html = mobileCompanionHTML(inp, HERO)
    expect(html).toContain(HERO)
    expect((html.match(/class="dot(?: on)?"/g) ?? []).length).toBe(2)
    expect(html).toContain('class="dot on"') // first pre-selected
    expect(html).toContain('$248.00')
    expect(html).toContain('>M<') // a size chip
    expect(html).toContain('Dry clean only')
  })

  it('links back to the 3D studio when a share URL is given', () => {
    expect(mobileCompanionHTML(inp, HERO, { shareUrl: 'https://x/s' })).toContain('href="https://x/s"')
    expect(mobileCompanionHTML(inp, HERO)).not.toContain('class="cta"')
  })

  it('escapes the name so a stray < cannot break the page', () => {
    const html = mobileCompanionHTML({ ...inp, name: 'A<b>' }, HERO)
    expect(html).toContain('A&lt;b&gt;')
  })
})
