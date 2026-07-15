/**
 * **E-commerce listing export** — turn a finished design into a marketplace listing
 * so it can be dropped straight into a shop: a **Shopify product CSV** (one row per
 * colour×size variant, in Shopify's import column order) and an **Etsy listing**
 * (title ≤140 chars, ≤13 tags, materials, price, variations). Pure string/data maths
 * (no DOM) so it's unit-tested; the studio saves the CSV/JSON via the export menu.
 */
export interface ListingColour {
  label: string
  /** `#rrggbb`. */
  hex: string
}

export interface ListingInput {
  name: string
  description?: string
  fabricName: string
  fibre: string
  colours: ListingColour[]
  sizes: string[]
  /** Retail price, USD. */
  priceUsd: number
  sku?: string
  careLines?: string[]
}

/** A tidy URL/handle slug from a product name. Pure. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'product'
}

/** An SEO-ish listing title, clamped to `max` chars (Etsy caps at 140). Pure. */
export function listingTitle(name: string, fabricName: string, max = 140): string {
  const t = `${name} — ${fabricName}`.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…'
}

/** Up to 13 lowercase marketplace tags derived from the design. Pure. */
export function listingTags(inp: ListingInput): string[] {
  const words = [
    ...inp.name.split(/\s+/),
    ...inp.fabricName.split(/\s+/),
    inp.fibre.replace(/[0-9%]/g, ''),
    'handmade',
    'made to order',
    ...inp.colours.map((c) => c.label)
  ]
  const seen = new Set<string>()
  const tags: string[] = []
  for (const w of words) {
    const t = w.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
    if (t.length >= 3 && !seen.has(t)) {
      seen.add(t)
      tags.push(t)
    }
    if (tags.length >= 13) break
  }
  return tags
}

const csvCell = (v: string | number): string => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * A Shopify product-import CSV — a header row plus one row per **colour × size**
 * variant, in Shopify's expected column order. The first variant row carries the
 * product-level fields (Title/Body/Vendor/Type); later rows only repeat the Handle.
 * Pure.
 */
export function shopifyCsv(inp: ListingInput): string {
  const cols = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
    'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
    'Variant SKU', 'Variant Inventory Qty', 'Variant Price', 'Variant Requires Shipping'
  ]
  const handle = slugify(inp.name)
  const body = `${inp.description ?? inp.name}. ${inp.fibre}.${inp.careLines?.length ? ' Care: ' + inp.careLines.join('; ') + '.' : ''}`
  const tags = listingTags(inp).join(', ')
  const rows: string[] = [cols.join(',')]
  let first = true
  for (const c of inp.colours.length ? inp.colours : [{ label: 'Default', hex: '#000000' }]) {
    for (const size of inp.sizes.length ? inp.sizes : ['One size']) {
      const sku = `${(inp.sku || handle).toUpperCase()}-${c.label.slice(0, 3).toUpperCase()}-${size}`
      const row = [
        handle,
        first ? inp.name : '',
        first ? body : '',
        first ? 'DesignIO' : '',
        first ? inp.fabricName : '',
        first ? tags : '',
        first ? 'TRUE' : '',
        'Color', c.label, 'Size', size,
        sku, 0, inp.priceUsd.toFixed(2), 'TRUE'
      ]
      rows.push(row.map(csvCell).join(','))
      first = false
    }
  }
  return rows.join('\n')
}

export interface EtsyListing {
  title: string
  description: string
  price: number
  tags: string[]
  materials: string[]
  variations: string[]
}

/** An Etsy-shaped listing object (title/description/tags/materials/variations). Pure. */
export function etsyListing(inp: ListingInput): EtsyListing {
  return {
    title: listingTitle(inp.name, inp.fabricName),
    description: `${inp.description ?? inp.name}\n\nFabric: ${inp.fabricName} (${inp.fibre}).\nMade to order in your choice of colour and size.${inp.careLines?.length ? '\n\nCare: ' + inp.careLines.join('; ') + '.' : ''}`,
    price: Math.round(inp.priceUsd * 100) / 100,
    tags: listingTags(inp),
    materials: [inp.fabricName, inp.fibre.replace(/^\d+%\s*/, '')].filter(Boolean),
    variations: [
      `Color: ${inp.colours.map((c) => c.label).join(', ') || 'Default'}`,
      `Size: ${inp.sizes.join(', ') || 'One size'}`
    ]
  }
}
