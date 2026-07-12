import type { Fabric } from '../fabric/FabricLibrary'
import { fibreContent } from './careLabel'

/**
 * **Sustainability suite** — the eco paperwork buyers increasingly require, derived
 * from the same fabric + construction data everything else uses:
 *  - a **material passport** (fibre, recyclability, mono-material, eco flags),
 *  - a **water / CO₂ footprint** estimate from the garment's real fabric mass,
 *  - a **circular-design score** (mono-material + disassembly heuristic),
 *  - **longevity care guidance** (wash/repair habits that extend garment life).
 * All pure + unit-tested; the manufacturing pack prints one section per garment.
 * Footprint coefficients are industry-ballpark per-kg figures (fibre production +
 * dyeing), intentionally round — an estimate for comparison, not an audit.
 */

/** Rough per-kg production footprints by fibre group (water L/kg · CO₂ kg/kg). */
const FOOTPRINT: Record<FibreGroup, { waterLPerKg: number; co2KgPerKg: number; recyclable: boolean }> = {
  cotton: { waterLPerKg: 9000, co2KgPerKg: 4, recyclable: true },
  wool: { waterLPerKg: 5000, co2KgPerKg: 18, recyclable: true },
  silk: { waterLPerKg: 4000, co2KgPerKg: 12, recyclable: true },
  synthetic: { waterLPerKg: 120, co2KgPerKg: 9, recyclable: false }, // low water, fossil CO₂, hard to recycle blended
  leather: { waterLPerKg: 14000, co2KgPerKg: 30, recyclable: false }
}

export type FibreGroup = 'cotton' | 'wool' | 'silk' | 'synthetic' | 'leather'

/** Classify a fabric into its dominant fibre group (drives the footprint + recyclability). */
export function fibreGroup(fabric: Fabric): FibreGroup {
  const id = fabric.id
  if (/leather|suede/.test(id)) return 'leather'
  if (/wool|tweed|flannel|cable/.test(id)) return 'wool'
  if (fabric.family === 'silk' || /silk|satin|charmeuse/.test(id)) return 'silk'
  if (/spandex|neoprene|lame|sequin|tulle|chiffon|organza|polyester|mesh|velvet|crepe/.test(id) || fabric.family === 'specialty') return 'synthetic'
  return 'cotton' // poplin · oxford · denim · canvas · linen · jerseys · terry …
}

export interface MaterialPassport {
  fibre: string
  group: FibreGroup
  recyclable: boolean
  /** Single fibre group throughout (no part/panel fabric mixing) — easiest to recycle. */
  monoMaterial: boolean
  recycled: boolean
  deadstock: boolean
}

export function materialPassport(fabric: Fabric, opts: { monoMaterial: boolean; recycled?: boolean; deadstock?: boolean }): MaterialPassport {
  const group = fibreGroup(fabric)
  return {
    fibre: fibreContent(fabric),
    group,
    recyclable: FOOTPRINT[group].recyclable,
    monoMaterial: opts.monoMaterial,
    recycled: !!opts.recycled,
    deadstock: !!opts.deadstock
  }
}

export interface Footprint {
  waterL: number
  co2Kg: number
  massKg: number
}

/** Per-garment footprint from the real fabric mass (gsm × area). Deadstock fabric
 *  already exists — its production footprint is sunk, so it counts near zero (10%
 *  for finishing/transport). */
export function garmentFootprint(fabric: Fabric, fabricAreaM2: number, opts: { deadstock?: boolean } = {}): Footprint {
  const massKg = Math.max(0, (fabric.gsm * Math.max(0, fabricAreaM2)) / 1000)
  const f = FOOTPRINT[fibreGroup(fabric)]
  const scale = opts.deadstock ? 0.1 : 1
  const round = (v: number): number => Math.round(v * 10) / 10
  return { waterL: Math.round(massKg * f.waterLPerKg * scale), co2Kg: round(massKg * f.co2KgPerKg * scale), massKg: round(massKg * 100) / 100 }
}

export interface CircularInputs {
  monoMaterial: boolean
  recyclableGroup: boolean
  recycled: boolean
  deadstock: boolean
  /** Mixed hardware (zips/buttons) that must be cut off before recycling. */
  hasClosure: boolean
  /** A bonded second material layer (lining/interfacing) — hard to separate. */
  lined: boolean
}

/** 0–100 circular-design score: how recyclable/disassemblable the piece is.
 *  Mono-material in a recyclable fibre is the backbone; eco sourcing adds;
 *  mixed hardware and bonded linings subtract (disassembly cost). */
export function circularScore(inp: CircularInputs): number {
  let score = 20 // baseline: it's a sewn garment, some value always recoverable
  if (inp.monoMaterial) score += 30
  if (inp.recyclableGroup) score += 25
  if (inp.recycled) score += 15
  if (inp.deadstock) score += 10
  if (inp.hasClosure) score -= 10
  if (inp.lined) score -= 15
  return Math.max(0, Math.min(100, score))
}

/** Wash/repair habits that extend this fabric's life (longevity guidance). */
export function longevityCare(fabric: Fabric): string[] {
  const group = fibreGroup(fabric)
  const lines = ['Wash less, spot-clean first — every wash costs fibre life', 'Air-dry flat; tumble heat is the top ager']
  if (group === 'cotton') lines.push('Cold wash keeps cotton from thinning + fading', 'Repair: patch or darn — cotton takes both invisibly')
  else if (group === 'wool') lines.push('Rest wool 24 h between wears; brush instead of washing', 'De-pill with a comb — do not shave knits thin')
  else if (group === 'silk') lines.push('Hand wash cold, dry away from sun (silk UV-fades)', 'Store hung on wide hangers — creases become breaks')
  else if (group === 'synthetic') lines.push('Wash cold in a microfibre bag (sheds fewer plastics)', 'Heat is fatal — no iron above low, no hot dryer')
  else lines.push('Condition leather yearly; keep away from radiators', 'Professional repair only — punctures spread if home-stitched')
  return lines
}
