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

// ---- pricing calculator: landed cost → margin → suggested wholesale + retail ----

export interface PriceInputs {
  /** Landed cost per unit, USD (typically `costRollup(...).total`). */
  cost: number
  /** Target gross margin on the wholesale price (0…0.95; default 0.5 = 50 %). */
  marginPct?: number
  /** Retail multiple over wholesale (keystone doubling = 2.0; default 2.2). */
  retailMultiple?: number
}

export interface PriceBreakdown {
  cost: number
  /** Wholesale price = cost / (1 − margin). */
  wholesale: number
  /** Suggested retail = wholesale × the retail multiple. */
  retail: number
  /** Realised gross margin on the wholesale price (should match the target). */
  marginPct: number
  /** Gross profit per unit at wholesale (wholesale − cost), USD. */
  marginUsd: number
  /** Markup over cost = (wholesale − cost) / cost. */
  markupPct: number
  currency: 'USD'
}

/**
 * Suggested **wholesale + retail** pricing from a landed cost and a target gross
 * margin. Wholesale is priced to hit the margin (`cost / (1 − margin)`); retail
 * applies the retail multiple (keystone ≈ 2×). Pure + unit-tested.
 */
export function priceFromCost(inp: PriceInputs): PriceBreakdown {
  const round = (v: number): number => Math.round(v * 100) / 100
  const round3 = (v: number): number => Math.round(v * 1000) / 1000
  const cost = Math.max(0, inp.cost)
  const margin = Math.max(0, Math.min(0.95, inp.marginPct ?? 0.5))
  const mult = Math.max(1, inp.retailMultiple ?? 2.2)
  const wholesale = round(cost / (1 - margin))
  const retail = round(wholesale * mult)
  const marginUsd = round(wholesale - cost)
  return {
    cost: round(cost),
    wholesale,
    retail,
    marginPct: wholesale > 0 ? round3(marginUsd / wholesale) : 0,
    marginUsd,
    markupPct: cost > 0 ? round3(marginUsd / cost) : 0,
    currency: 'USD'
  }
}
