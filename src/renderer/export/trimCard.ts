import { buttonCount } from '../studio/closureDesign'
import type { ClosureDesign } from '../studio/closureDesign'

/**
 * **Trim card** — the page of a tech pack that lists everything that isn't fabric:
 * buttons, zips, thread, elastic, labels, hardware. A factory sources from this page,
 * so every line needs a quantity and enough of a spec to buy against.
 *
 * Derived from the construction rather than kept by hand: a garment with its closure
 * switched off must not still be sourcing buttons. Pure + unit-tested.
 */

export type TrimKind = 'closure' | 'thread' | 'elastic' | 'label' | 'hardware' | 'finish'

export interface TrimLine {
  kind: TrimKind
  /** What to buy, e.g. "Shell button, 13 mm". */
  item: string
  /** How many, in `unit`s. */
  qty: number
  unit: 'pcs' | 'm'
  /** Where it goes on the garment. */
  placement: string
  /** Colour swatch for the card (0xRRGGBB), where the trim is coloured. */
  color?: number
}

export interface TrimCardInput {
  /** Front closure, if the garment has one. */
  closure?: 'button' | 'zip'
  closureDesign?: ClosureDesign
  /** Placket height in metres — drives the automatic button count. */
  placketHeightM?: number
  /** Total seam length (cm) — drives thread. */
  seamCm: number
  /** Thread metres, already costed elsewhere; passed in so the card and the BOM agree. */
  threadM: number
  /** Construction flags that imply a trim. */
  drawstring?: boolean
  waistband?: boolean
  ribbing?: boolean
  fringe?: boolean
  piping?: boolean
  lined?: boolean
  /** Contrast trim fabric colour, when a contrast trim is on. */
  trimColor?: number
  /** Hardware lines already derived by `hardwareBOM`. */
  hardware?: { label: string; count: number }[]
  /** Main body colour, for trims that match the shell. */
  bodyColor: number
}

const round1 = (n: number): number => Math.round(Math.max(0, n) * 10) / 10

/**
 * Every trim the construction implies, in sourcing order (closures first — they have
 * the longest lead time — then thread, then the rest).
 *
 * A care/composition label is always present: it is a legal requirement in every
 * market this would ship to, not a design choice, so it is not conditional on a flag.
 */
export function trimCard(inp: TrimCardInput): TrimLine[] {
  const lines: TrimLine[] = []

  if (inp.closure === 'button') {
    const mm = inp.closureDesign?.buttonMm ?? 13
    lines.push({
      kind: 'closure',
      item: `Shell button, ${mm} mm`,
      qty: buttonCount(inp.placketHeightM ?? 0.42, inp.closureDesign?.buttons),
      unit: 'pcs',
      placement: 'Centre-front placket',
      color: inp.closureDesign?.buttonColor ?? inp.bodyColor
    })
  } else if (inp.closure === 'zip') {
    lines.push({
      kind: 'closure',
      item: 'Separating zip',
      qty: 1,
      unit: 'pcs',
      placement: 'Centre front',
      color: inp.closureDesign?.zipColor ?? inp.bodyColor
    })
    lines.push({ kind: 'closure', item: 'Zip pull', qty: 1, unit: 'pcs', placement: 'Centre front', color: inp.closureDesign?.pullColor ?? inp.bodyColor })
  }

  lines.push({ kind: 'thread', item: 'Sewing thread (tex 40)', qty: round1(inp.threadM), unit: 'm', placement: 'All seams', color: inp.bodyColor })

  if (inp.drawstring) {
    lines.push({ kind: 'elastic', item: 'Drawstring cord, 5 mm', qty: 1.4, unit: 'm', placement: 'Waist / hood channel', color: inp.bodyColor })
  }
  if (inp.waistband) {
    lines.push({ kind: 'elastic', item: 'Waistband elastic, 35 mm', qty: 1, unit: 'm', placement: 'Waist' })
  }
  if (inp.ribbing) {
    lines.push({ kind: 'finish', item: 'Rib knit trim', qty: 0.6, unit: 'm', placement: 'Cuffs / hem / neck', color: inp.trimColor ?? inp.bodyColor })
  }
  if (inp.fringe) {
    lines.push({ kind: 'finish', item: 'Fringe trim', qty: 1.2, unit: 'm', placement: 'Bottom hem', color: inp.trimColor ?? inp.bodyColor })
  }
  if (inp.piping) {
    lines.push({ kind: 'finish', item: 'Corded piping, 3 mm', qty: round1((inp.seamCm / 100) * 0.35), unit: 'm', placement: 'Neckline & hem', color: inp.trimColor ?? inp.bodyColor })
  }
  if (inp.lined) {
    lines.push({ kind: 'finish', item: 'Lining fabric', qty: 1.2, unit: 'm', placement: 'Body lining' })
  }

  for (const h of inp.hardware ?? []) {
    if (h.count > 0) lines.push({ kind: 'hardware', item: h.label, qty: h.count, unit: 'pcs', placement: 'See hardware placement' })
  }

  // Always — a care/composition label is a legal requirement, not a styling choice.
  lines.push({ kind: 'label', item: 'Woven care/composition label', qty: 1, unit: 'pcs', placement: 'Centre-back neck / side seam' })
  lines.push({ kind: 'label', item: 'Brand label', qty: 1, unit: 'pcs', placement: 'Centre-back neck' })

  return lines
}

/** Totals per unit, so the card can be checked against a purchase order at a glance. */
export function trimTotals(lines: TrimLine[]): { pcs: number; metres: number } {
  return {
    pcs: lines.filter((l) => l.unit === 'pcs').reduce((n, l) => n + l.qty, 0),
    metres: round1(lines.filter((l) => l.unit === 'm').reduce((n, l) => n + l.qty, 0))
  }
}
