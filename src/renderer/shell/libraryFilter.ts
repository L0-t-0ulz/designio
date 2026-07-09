/**
 * Pure filter logic for the Library's fabric browser — a text query plus
 * structured filters by family, weight (gsm bucket) and stretch. Kept separate
 * from the DOM so it's unit-tested; `library.ts` renders the chips + calls these.
 */
export type WeightBucket = 'any' | 'light' | 'medium' | 'heavy'
export type StretchBucket = 'any' | 'rigid' | 'stretch'

export interface FabricFilter {
  query: string
  family: string // a family id, or 'all'
  weight: WeightBucket
  stretch: StretchBucket
}

export const EMPTY_FILTER: FabricFilter = { query: '', family: 'all', weight: 'any', stretch: 'any' }

/** Areal-weight bucket for a gsm: light < 150 ≤ medium ≤ 300 < heavy. */
export function weightBucket(gsm: number): 'light' | 'medium' | 'heavy' {
  return gsm < 150 ? 'light' : gsm <= 300 ? 'medium' : 'heavy'
}

/** In-plane stretch bucket: rigid (wovens) < 0.3 ≤ stretch (knits). */
export function stretchBucket(stretch: number): 'rigid' | 'stretch' {
  return stretch >= 0.3 ? 'stretch' : 'rigid'
}

/** A fabric-shaped record the filter reads (a subset of `Fabric`). */
export interface FilterableFabric {
  name: string
  family: string
  gsm: number
  stretch: number
}

/** Whether a fabric passes the filter (all set constraints must hold). */
export function matchesFabric(f: FilterableFabric, flt: FabricFilter): boolean {
  if (flt.query && !f.name.toLowerCase().includes(flt.query)) return false
  if (flt.family !== 'all' && f.family !== flt.family) return false
  if (flt.weight !== 'any' && weightBucket(f.gsm) !== flt.weight) return false
  if (flt.stretch !== 'any' && stretchBucket(f.stretch) !== flt.stretch) return false
  return true
}
