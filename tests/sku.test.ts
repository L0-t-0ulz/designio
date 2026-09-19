import { describe, it, expect } from 'vitest'
import { INTERNAL_PREFIX, buildSKU, ean13CheckDigit, internalBarcode, isValidEAN13, skuAndBarcode } from '../src/renderer/export/sku'

describe('SKU', () => {
  it('joins style, colour and size', () => {
    expect(buildSKU({ style: 'Hoodie', colour: 'TR-6030', size: 'M' })).toBe('HOODIE-TR6030-M')
  })

  it('normalises case, spaces and punctuation', () => {
    expect(buildSKU({ style: 'bomber jacket', colour: 'tr 1080', size: 'xl' })).toBe('BOMBERJA-TR1080-XL')
  })

  it('strips accents rather than deleting the letter', () => {
    // "crème" must not become "CRME"
    expect(buildSKU({ style: 'crème', colour: 'x', size: 's' })).toBe('CREME-X-S')
  })

  it('drops a segment that normalises to nothing instead of leaving a hole', () => {
    expect(buildSKU({ style: 'Top', colour: '', size: 'M' })).toBe('TOP-M')
    expect(buildSKU({ style: 'Top', colour: '—', size: 'M' })).toBe('TOP-M')
  })

  it('is deterministic', () => {
    const p = { style: 'Top', colour: 'TR-1000', size: 'S' }
    expect(buildSKU(p)).toBe(buildSKU(p))
  })

  it('copes with nothing at all', () => {
    expect(buildSKU({ style: '', colour: '', size: '' })).toBe('')
  })
})

describe('EAN-13 check digit', () => {
  it('matches known real-world barcodes', () => {
    // published EAN-13 examples with their true check digits
    expect(ean13CheckDigit('400638133393')).toBe(1)
    expect(ean13CheckDigit('978014300723')).toBe(4)
    expect(ean13CheckDigit('590123412345')).toBe(7)
  })

  it('validates a complete code', () => {
    expect(isValidEAN13('4006381333931')).toBe(true)
    expect(isValidEAN13('9780143007234')).toBe(true)
  })

  it('rejects a wrong check digit', () => {
    expect(isValidEAN13('4006381333930')).toBe(false)
  })

  it('rejects anything that is not 13 digits', () => {
    for (const bad of ['', '123', '40063813339311', 'abcdefghijklm', '400638133393 ']) {
      expect(isValidEAN13(bad)).toBe(false)
    }
  })

  it('catches a single-digit typo — the whole point of a check digit', () => {
    const good = '4006381333931'
    let caught = 0
    for (let i = 0; i < 12; i++) {
      for (let d = 0; d <= 9; d++) {
        const digit = String(d)
        if (good[i] === digit) continue
        const typo = good.slice(0, i) + digit + good.slice(i + 1)
        if (!isValidEAN13(typo)) caught++
      }
    }
    expect(caught).toBe(12 * 9) // every single-digit substitution is rejected
  })
})

describe('internal barcode', () => {
  it('is a valid EAN-13', () => {
    for (const sku of ['HOODIE-TR6030-M', 'TOP-M', 'A', '']) {
      expect(isValidEAN13(internalBarcode(sku))).toBe(true)
    }
  })

  it('uses a GS1 restricted-distribution prefix, not a registered one', () => {
    // 20-29 is what GS1 reserves for codes a company assigns itself; inventing a
    // number in a registered range would collide with a real product
    expect(internalBarcode('X').startsWith(INTERNAL_PREFIX)).toBe(true)
    expect(Number(INTERNAL_PREFIX)).toBeGreaterThanOrEqual(20)
    expect(Number(INTERNAL_PREFIX)).toBeLessThanOrEqual(29)
  })

  it('is stable — a re-export must not renumber the warehouse', () => {
    expect(internalBarcode('HOODIE-TR6030-M')).toBe(internalBarcode('HOODIE-TR6030-M'))
  })

  it('separates different garments', () => {
    const codes = new Set(['HOODIE-TR6030-M', 'HOODIE-TR6030-L', 'HOODIE-TR1080-M', 'TOP-TR6030-M'].map((s) => internalBarcode(s)))
    expect(codes.size).toBe(4)
  })
})

describe('skuAndBarcode', () => {
  it('returns a matching pair', () => {
    const p = { style: 'Hoodie', colour: 'TR-6030', size: 'M' }
    const { sku, barcode } = skuAndBarcode(p)
    expect(sku).toBe('HOODIE-TR6030-M')
    expect(barcode).toBe(internalBarcode(sku))
    expect(isValidEAN13(barcode)).toBe(true)
  })
})
