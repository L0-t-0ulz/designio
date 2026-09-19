/**
 * **SKU + barcode** for the spec sheet — the identifiers a factory, a warehouse and a
 * line sheet all need to refer to the same garment.
 *
 * Both are derived deterministically from the design, so the same garment in the same
 * colour and size always produces the same codes: a spec sheet re-exported after an
 * unrelated edit must not hand the warehouse a different number.
 */

/** Uppercase, strip anything that isn't alphanumeric, collapse the rest. */
function segment(text: string, max = 8): string {
  const clean = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accents rather than deleting the letter
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
  return clean.slice(0, max)
}

export interface SkuParts {
  /** Garment/style, e.g. "hoodie". */
  style: string
  /** Colour reference — the production code where there is one, else the hex. */
  colour: string
  /** Manufacturing size label. */
  size: string
}

/**
 * A human-readable SKU, e.g. `HOODIE-TR6030-M`.
 *
 * Segments that normalise to nothing are dropped rather than leaving an empty field,
 * so a missing colour reference gives `HOODIE-M`, not `HOODIE--M`.
 */
export function buildSKU(p: SkuParts): string {
  return [segment(p.style), segment(p.colour), segment(p.size, 4)].filter((s) => s.length > 0).join('-')
}

/**
 * The EAN-13 check digit for 12 digits: positions alternate weight 1 and 3 from the
 * left, and the digit is whatever takes the weighted sum to a multiple of ten.
 */
export function ean13CheckDigit(first12: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const d = first12.charCodeAt(i) - 48
    sum += i % 2 === 0 ? d : d * 3
  }
  return (10 - (sum % 10)) % 10
}

/** Whether a string is a well-formed EAN-13 with a correct check digit. */
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  return ean13CheckDigit(code.slice(0, 12)) === code.charCodeAt(12) - 48
}

/** A stable non-cryptographic hash (FNV-1a), so one SKU always maps to one barcode. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * GS1 reserves prefixes 20–29 for **restricted distribution** — codes a company
 * assigns itself for internal use. We use 20, because a barcode invented by a design
 * tool is exactly that: it is not, and must not pretend to be, a registered GS1
 * number, which requires a company prefix you license.
 */
export const INTERNAL_PREFIX = '20'

/**
 * A deterministic internal EAN-13 for a SKU. Same SKU in, same barcode out — a
 * re-export must not renumber the warehouse.
 */
export function internalBarcode(sku: string, prefix = INTERNAL_PREFIX): string {
  const digits = String(hash(sku)).padStart(10, '0').slice(-10)
  const first12 = (prefix + digits).slice(0, 12).padEnd(12, '0')
  return first12 + ean13CheckDigit(first12)
}

/** Both identifiers for one garment. */
export function skuAndBarcode(p: SkuParts): { sku: string; barcode: string } {
  const sku = buildSKU(p)
  return { sku, barcode: internalBarcode(sku) }
}
