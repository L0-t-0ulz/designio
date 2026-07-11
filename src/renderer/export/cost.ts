/**
 * Landed **cost sheet** for a garment — fabric yield × price + thread + trims + labour,
 * plus an overhead markup, rolled up to a cost/unit. Pure string-free math so it's
 * unit-tested; the manufacturing pack renders it. A first-pass estimate (prices are
 * placeholders until real supplier data is wired), but the arithmetic is real.
 */

export interface TrimCost {
  name: string
  qty: number
  /** Unit cost in USD. */
  unitCost: number
}

export interface CostInputs {
  /** Linear metres of fabric (the nested marker length). */
  fabricM: number
  /** Fabric price, USD per linear metre. */
  pricePerM: number
  /** Metres of thread. */
  threadM: number
  /** Placed trims — buttons, zips, etc. */
  trims?: TrimCost[]
  /** Sewing labour, minutes. */
  labourMin: number
  /** Labour rate, USD per hour. */
  labourRate: number
  /** Waste/overhead markup fraction (default 0.15 = 15 %). */
  overheadPct?: number
}

export interface CostBreakdown {
  fabric: number
  thread: number
  trims: number
  labour: number
  overhead: number
  /** Landed cost per unit, USD. */
  total: number
  currency: 'USD'
}

/** Thread is cheap — roughly $0.004 per metre of lockstitch thread. */
const THREAD_PRICE_PER_M = 0.004

/** Estimate sewing minutes from the total seam length — a base setup + time per seam cm. */
export function estimateLabourMinutes(seamCm: number): number {
  return Math.round((12 + Math.max(0, seamCm) / 18) * 10) / 10 // 12 min setup + ~1 min / 18 cm
}

export function costRollup(inp: CostInputs): CostBreakdown {
  const round = (v: number): number => Math.round(v * 100) / 100
  const fabric = round(Math.max(0, inp.fabricM) * Math.max(0, inp.pricePerM))
  const thread = round(Math.max(0, inp.threadM) * THREAD_PRICE_PER_M)
  const trims = round((inp.trims ?? []).reduce((s, t) => s + Math.max(0, t.qty) * Math.max(0, t.unitCost), 0))
  const labour = round((Math.max(0, inp.labourMin) / 60) * Math.max(0, inp.labourRate))
  const sub = fabric + thread + trims + labour
  const overhead = round(sub * (inp.overheadPct ?? 0.15))
  return { fabric, thread, trims, labour, overhead, total: round(sub + overhead), currency: 'USD' }
}
