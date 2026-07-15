import { describe, it, expect } from 'vitest'
import { slugify, listingTitle, listingTags, shopifyCsv, etsyListing, type ListingInput } from '../src/renderer/export/listing'

const inp: ListingInput = {
  name: 'Aurora Slip Dress',
  fabricName: 'Silk charmeuse',
  fibre: '100% Silk',
  colours: [{ label: 'Blush', hex: '#e8c4c0' }, { label: 'Noir', hex: '#111111' }],
  sizes: ['XS', 'S', 'M', 'L'],
  priceUsd: 189,
  careLines: ['Hand wash cold', 'Dry flat']
}

describe('e-commerce listing export', () => {
  it('slugify makes a clean handle', () => {
    expect(slugify('Aurora Slip Dress')).toBe('aurora-slip-dress')
    expect(slugify('  Weird!!  Name??  ')).toBe('weird-name')
    expect(slugify('')).toBe('product')
  })

  it('listingTitle clamps to the max length', () => {
    expect(listingTitle('Aurora Slip Dress', 'Silk charmeuse')).toBe('Aurora Slip Dress — Silk charmeuse')
    const long = listingTitle('x'.repeat(200), 'Silk', 40)
    expect(long.length).toBeLessThanOrEqual(40)
    expect(long.endsWith('…')).toBe(true)
  })

  it('listingTags: ≤13 unique lowercase tags drawn from the design', () => {
    const tags = listingTags(inp)
    expect(tags.length).toBeLessThanOrEqual(13)
    expect(new Set(tags).size).toBe(tags.length) // unique
    expect(tags.every((t) => t === t.toLowerCase())).toBe(true)
    expect(tags).toContain('silk')
    expect(tags).toContain('blush')
  })

  it('shopifyCsv has a header + one row per colour×size, product fields only on the first row', () => {
    const csv = shopifyCsv(inp)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Handle')
    expect(lines[0]).toContain('Variant Price')
    // 2 colours × 4 sizes = 8 variant rows + 1 header
    expect(lines.length).toBe(1 + 2 * 4)
    // first variant row carries the Title; a later one does not
    expect(lines[1]).toContain('Aurora Slip Dress')
    expect(lines[2].split(',')[1]).toBe('') // Title column empty on row 2
    // every variant row ends with the price
    for (const l of lines.slice(1)) expect(l).toContain('189.00')
  })

  it('shopifyCsv escapes commas/quotes safely', () => {
    const csv = shopifyCsv({ ...inp, name: 'Dress, with comma', description: 'He said "hi"' })
    expect(csv).toContain('"Dress, with comma"')
    expect(csv).toContain('""hi""') // doubled quotes
  })

  it('etsyListing shapes title/tags/materials/variations', () => {
    const e = etsyListing(inp)
    expect(e.title.length).toBeLessThanOrEqual(140)
    expect(e.price).toBe(189)
    expect(e.tags.length).toBeLessThanOrEqual(13)
    expect(e.materials).toContain('Silk charmeuse')
    expect(e.variations.some((v) => v.startsWith('Color:'))).toBe(true)
    expect(e.variations.some((v) => v.includes('XS, S, M, L'))).toBe(true)
  })

  it('handles an empty colour/size design (defaults to one variant)', () => {
    const csv = shopifyCsv({ ...inp, colours: [], sizes: [] })
    expect(csv.split('\n').length).toBe(1 + 1) // header + 1 default variant
  })
})
