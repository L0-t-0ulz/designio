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

// ---- headwear cost: small-panel yield + hat-specific trims -------------------

/**
 * Fabric yield (linear metres at bolt width) for a **small-panel headwear** garment.
 * A hat is cut from small crown gores / a brim / a band that nest with more waste
 * than long body panels, and there's a per-hat minimum cut, so its yield can't be
 * read off the body marker. Pure + unit-tested.
 */
export function headwearFabricM(fabricAreaM2: number, boltWidthCm = 140): number {
  const SMALL_PANEL_WASTE = 1.6 // small panels nest poorly vs. a body garment's ~1.4
  const MIN_CUT_M = 0.15 // you can't buy less than a short cut
  const theoreticalM = Math.max(0, fabricAreaM2) / Math.max(0.01, boltWidthCm / 100)
  return Math.round(Math.max(MIN_CUT_M, theoreticalM * SMALL_PANEL_WASTE) * 1000) / 1000
}

/** Which hat-specific notions a headwear garment carries. */
export interface HeadwearTrimInputs {
  /** A faux-fur / yarn pom on the crown (pom beanie · chullo). */
  pom?: boolean
  /** An inner grosgrain / terry sweatband (structured / brimmed hats). */
  sweatband?: boolean
  /** Millinery wire sewn into the brim edge (shaped brims). */
  brimWire?: boolean
  /** A stretch band at the back (fitted / adjustable caps). */
  elastic?: boolean
}

/** First-pass unit costs (USD) for headwear notions — placeholders like the fabric prices. */
const HEADWEAR_TRIM_UNIT = { pom: 1.2, sweatband: 0.35, brimWire: 0.25, elastic: 0.15 } as const

/**
 * Hat-specific **trims / notions** as costed BOM rows — a hat's trims are a pom /
 * brim wire / sweatband / elastic, not a shirt's buttons and zips. Feeds
 * `costRollup({ trims })`. Pure + unit-tested.
 */
export function headwearTrims(inp: HeadwearTrimInputs): TrimCost[] {
  const trims: TrimCost[] = []
  if (inp.pom) trims.push({ name: 'Pom-pom', qty: 1, unitCost: HEADWEAR_TRIM_UNIT.pom })
  if (inp.sweatband) trims.push({ name: 'Sweatband', qty: 1, unitCost: HEADWEAR_TRIM_UNIT.sweatband })
  if (inp.brimWire) trims.push({ name: 'Brim wire', qty: 1, unitCost: HEADWEAR_TRIM_UNIT.brimWire })
  if (inp.elastic) trims.push({ name: 'Elastic band', qty: 1, unitCost: HEADWEAR_TRIM_UNIT.elastic })
  return trims
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
