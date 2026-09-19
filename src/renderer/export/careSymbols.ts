/**
 * **ISO 3758 care symbols** — the wash / bleach / dry / iron / professional-care
 * pictograms, drawn as inline SVG from the care lines `careLabel` already derives.
 * The variant for each symbol is read from the care text (keyword rules), so the
 * text stays the single source of truth. Pure (returns strings, no DOM) + unit-tested;
 * the manufacturing pack renders the row beside the written care instructions.
 */
import type { CareInstructions } from './careLabel'

export interface CareSymbol {
  /** Which symbol. `dry` is natural drying, `tumble` is machine drying — ISO 3758
   *  treats them as two symbols, and a garment can carry both. */
  key: 'wash' | 'bleach' | 'dry' | 'tumble' | 'iron' | 'pro'
  /** The drawn variant (temperature / prohibition / method). */
  variant: string
  /** Human caption. */
  label: string
}

const washVariant = (t: string): string =>
  /do not wash/i.test(t) ? 'no' : /hand wash/i.test(t) ? 'hand' : /warm/i.test(t) ? 'warm' : /cool/i.test(t) ? 'cool' : 'cold'
const bleachVariant = (t: string): string => (/do not bleach/i.test(t) ? 'no' : /non-chlorine/i.test(t) ? 'nonchlorine' : 'any')
/**
 * The **natural-drying** symbol (the plain square). Null when the care text gives no
 * natural-drying instruction — a tumble-dried garment says nothing about how to hang
 * it, and an empty square asserting otherwise is noise on the label.
 */
const dryVariant = (t: string): string | null =>
  /flat/i.test(t) ? 'flat' : /line dry|hang/i.test(t) ? 'line' : null

/**
 * The **tumble-drying** symbol (the circle in a square), which ISO 3758 treats as its
 * own symbol rather than a variant of natural drying.
 *
 * That distinction is the point: "Dry flat, do not tumble" is *two* instructions, and
 * folding them into one slot meant the prohibition was dropped whenever a natural-dry
 * instruction was also present — which is every wool garment.
 *
 * Returns null when the care text says nothing about machine drying, so the symbol is
 * simply absent rather than guessing a permission nobody gave.
 */
const tumbleVariant = (t: string): string | null => {
  if (/do not tumble|no tumble/i.test(t)) return 'no'
  if (/tumble dry low|tumble low/i.test(t)) return 'low'
  if (/tumble/i.test(t)) return 'medium'
  return null
}
const ironVariant = (t: string): string => (/do not iron/i.test(t) ? 'no' : /hot/i.test(t) ? 'hot' : /medium/i.test(t) ? 'medium' : 'cool')
const proVariant = (t: string): string => (/do not dry clean/i.test(t) ? 'no' : 'dryclean')

/** The natural-drying symbol, or nothing when the text gives no such instruction. */
function drySymbol(dry: string): CareSymbol[] {
  const variant = dryVariant(dry)
  return variant === null ? [] : [{ key: 'dry', variant, label: variant === 'flat' ? 'Dry flat' : 'Line dry' }]
}

/** The tumble symbol, or nothing when the care text is silent about machine drying. */
function tumbleSymbol(dry: string): CareSymbol[] {
  const variant = tumbleVariant(dry)
  return variant === null ? [] : [{ key: 'tumble', variant, label: variant === 'no' ? 'Do not tumble' : 'Tumble dry' }]
}

/** The ISO care symbols for a garment's care instructions. Natural drying and tumble
 *  drying are separate symbols, so a garment may yield five or six. */
export function careSymbols(c: CareInstructions): CareSymbol[] {
  return [
    { key: 'wash', variant: washVariant(c.wash), label: 'Wash' },
    { key: 'bleach', variant: bleachVariant(c.bleach), label: 'Bleach' },
    ...drySymbol(c.dry),
    ...tumbleSymbol(c.dry),
    { key: 'iron', variant: ironVariant(c.iron), label: 'Iron' },
    { key: 'pro', variant: proVariant(c.professional), label: 'Dry clean' }
  ]
}

// ---- glyph drawing (44×44 box, monochrome line art) ----
const S = '#2a2f3a'
const stroke = `fill="none" stroke="${S}" stroke-width="2.2" stroke-linejoin="round"`
const cross = `<line x1="5" y1="6" x2="39" y2="38" stroke="${S}" stroke-width="2.2"/><line x1="39" y1="6" x2="5" y2="38" stroke="${S}" stroke-width="2.2"/>`
const DOTS: Record<number, number[]> = { 1: [22], 2: [16, 28], 3: [13, 22, 31] }
const dots = (n: number, cy: number): string => (DOTS[n] ?? []).map((cx) => `<circle cx="${cx}" cy="${cy}" r="2.1" fill="${S}"/>`).join('')

function washGlyph(v: string): string {
  const tub = `<path d="M6,17 L38,17 L34,37 L10,37 Z" ${stroke}/><path d="M9,16 q3,-3.5 6,0 t6,0 t6,0 t4,0" ${stroke} stroke-width="1.6"/>`
  if (v === 'no') return tub + cross
  if (v === 'hand') return tub + `<rect x="15" y="28" width="15" height="3.4" rx="1.4" fill="${S}"/>${[16, 19.5, 23, 26.5].map((x) => `<rect x="${x}" y="22" width="2" height="7" rx="1" fill="${S}"/>`).join('')}`
  return tub + dots(v === 'cold' ? 1 : v === 'cool' ? 2 : 3, 28)
}
function bleachGlyph(v: string): string {
  const tri = `<path d="M22,7 L39,38 L5,38 Z" ${stroke}/>`
  if (v === 'no') return tri + cross
  if (v === 'nonchlorine') return tri + `<line x1="15" y1="32" x2="21" y2="20" stroke="${S}" stroke-width="1.8"/><line x1="21" y1="32" x2="27" y2="20" stroke="${S}" stroke-width="1.8"/>`
  return tri
}
/** Natural drying — the plain square, with a line saying how to hang it: horizontal
 *  for **dry flat**, vertical for line dry. */
function dryGlyph(v: string): string {
  const sq = `<rect x="7" y="9" width="30" height="30" rx="1.5" ${stroke}/>`
  if (v === 'line') return sq + `<line x1="22" y1="14" x2="22" y2="34" stroke="${S}" stroke-width="2.2"/>`
  return sq + `<line x1="14" y1="24" x2="30" y2="24" stroke="${S}" stroke-width="2.2"/>`
}

/** Tumble drying — the circle in a square; dots are the heat setting, a cross forbids it. */
function tumbleGlyph(v: string): string {
  const sq = `<rect x="7" y="9" width="30" height="30" rx="1.5" ${stroke}/>`
  const circ = `<circle cx="22" cy="24" r="10.5" ${stroke}/>`
  if (v === 'no') return sq + circ + cross
  return sq + circ + dots(v === 'low' ? 1 : 2, 24)
}
function ironGlyph(v: string): string {
  const iron = `<path d="M6,32 L38,32 L33,24 L15,24 Q9,24 6,31 Z" ${stroke}/><path d="M15,24 Q19,18 31,21" ${stroke} stroke-width="1.6"/>`
  if (v === 'no') return iron + cross
  return iron + dots(v === 'cool' ? 1 : v === 'medium' ? 2 : 3, 29)
}
function proGlyph(v: string): string {
  const circ = `<circle cx="22" cy="23" r="14" ${stroke}/>`
  if (v === 'no') return circ + cross
  return circ + `<text x="22" y="24" font-size="15" font-family="serif" text-anchor="middle" dominant-baseline="central" fill="${S}">P</text>`
}

const GLYPH: Record<CareSymbol['key'], (v: string) => string> = { wash: washGlyph, bleach: bleachGlyph, dry: dryGlyph, tumble: tumbleGlyph, iron: ironGlyph, pro: proGlyph }

/** Render the care symbols as a row of captioned SVG glyphs (an HTML fragment). */
export function careSymbolsSVG(symbols: CareSymbol[]): string {
  const cells = symbols
    .map(
      (s) =>
        `<figure class="care-sym"><svg viewBox="0 0 44 44" width="44" height="44" aria-label="${s.label}">${GLYPH[s.key](s.variant)}</svg><figcaption>${s.label}</figcaption></figure>`
    )
    .join('')
  return `<div class="care-symbols">${cells}</div>`
}
