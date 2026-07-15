import { describe, it, expect } from 'vitest'
import { portfolioHtml, portfolioDate, type PortfolioItem } from '../src/renderer/export/portfolio'

const items: PortfolioItem[] = [
  { name: 'Aurora Slip Dress', thumb: 'data:image/png;base64,AAAA', updatedAt: Date.UTC(2026, 6, 15) },
  { name: 'Nimbus Coat', updatedAt: Date.UTC(2026, 0, 3) }
]

describe('public portfolio page', () => {
  it('renders a full doc with the brand + a card per item', () => {
    const html = portfolioHtml('L0$T$0LZ', items)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('L0$T$0LZ')
    expect((html.match(/class="card"/g) || []).length).toBe(2)
    expect(html).toContain('Aurora Slip Dress')
    expect(html).toContain('Nimbus Coat')
  })

  it('embeds the thumbnail when present, else a placeholder', () => {
    const html = portfolioHtml('B', items)
    expect(html).toContain('src="data:image/png;base64,AAAA"')
    expect(html).toContain('class="ph"') // Nimbus has no thumb
  })

  it('portfolioDate gives a stable Mon-Year label (or empty)', () => {
    expect(portfolioDate(Date.UTC(2026, 6, 15))).toBe('Jul 2026')
    expect(portfolioDate(Date.UTC(2026, 0, 3))).toBe('Jan 2026')
    expect(portfolioDate(0)).toBe('')
    expect(portfolioDate(undefined)).toBe('')
  })

  it('escapes brand + names', () => {
    const html = portfolioHtml('B & <b>', [{ name: 'X <i>' }])
    expect(html).toContain('B &amp; &lt;b&gt;')
    expect(html).toContain('X &lt;i&gt;')
    expect(html).not.toContain('<i>')
  })

  it('shows an empty state for no projects', () => {
    expect(portfolioHtml('B', [])).toContain('No designs yet')
  })
})
