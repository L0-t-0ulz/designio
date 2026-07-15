/**
 * Metal hardware trims — pure **placement** math (unit-tested) for the three
 * fasteners a garment's construction implies: **rivets** reinforcing the top
 * corners of jeans hip pockets on heavy/workwear cloth, **eyelets** (grommets)
 * where a drawstring exits the centre front, and **snaps** down a snap-front
 * placket on a heavy closure. The manufacturing pack rolls the placements into a
 * hardware line in the bill of materials (count + location per fastener). The
 * positions are real garment-space metres so the same data can drive 3D trims
 * later; today they feed the tech-pack BOM.
 */
import type { PocketPlacement } from './decor'

export type HardwareKind = 'rivet' | 'eyelet' | 'snap'

export interface HardwarePlacement {
  kind: HardwareKind
  /** Garment-space position (metres). */
  x: number
  y: number
  z: number
}

export interface HardwareInput {
  /** Hip pockets to rivet (from `pocketPlacements`); rivets sit at their top corners. */
  pockets: PocketPlacement[]
  /** Reinforce the pockets with rivets — heavy/workwear cloth only. */
  rivet: boolean
  /** A drawstring exits the front → two eyelet grommets flank centre-front. */
  eyelet: boolean
  /** A snap-front placket → a column of snaps neck→hem. Heavy closures only. */
  snap: boolean
  /** Front surface z + the vertical anchors the eyelet/snap columns use (metres). */
  frontZ: number
  waistY: number
  neckY: number
  hemY: number
}

/** How many snaps run down a snap-front placket. */
const SNAP_COUNT = 5

/** Every hardware fastener a garment's construction implies. Pure + deterministic. */
export function hardwarePlacements(inp: HardwareInput): HardwarePlacement[] {
  const out: HardwarePlacement[] = []
  // Rivets: reinforce the two top corners of each hip pocket (the classic jeans burst points).
  if (inp.rivet)
    for (const p of inp.pockets) {
      const yTop = p.y + p.h / 2
      out.push({ kind: 'rivet', x: p.x - p.w / 2, y: yTop, z: p.z })
      out.push({ kind: 'rivet', x: p.x + p.w / 2, y: yTop, z: p.z })
    }
  // Eyelets: two grommets flanking centre-front where the drawstring exits.
  if (inp.eyelet) {
    out.push({ kind: 'eyelet', x: -0.02, y: inp.waistY, z: inp.frontZ })
    out.push({ kind: 'eyelet', x: 0.02, y: inp.waistY, z: inp.frontZ })
  }
  // Snaps: a column down the centre-front placket, evenly spaced neck→hem.
  if (inp.snap)
    for (let i = 0; i < SNAP_COUNT; i++) {
      const t = (i + 0.5) / SNAP_COUNT
      out.push({ kind: 'snap', x: 0, y: inp.neckY + (inp.hemY - inp.neckY) * t, z: inp.frontZ })
    }
  return out
}

const LOCATION: Record<HardwareKind, string> = {
  rivet: 'pocket corners',
  eyelet: 'drawstring exit',
  snap: 'front placket'
}

export interface HardwareBOMLine {
  kind: HardwareKind
  count: number
  /** Tech-pack label, e.g. "6 × rivet (pocket corners)". */
  label: string
}

/** Roll placements up into one BOM line per fastener kind (count + location). Pure. */
export function hardwareBOM(placements: HardwarePlacement[]): HardwareBOMLine[] {
  const order: HardwareKind[] = ['rivet', 'eyelet', 'snap']
  return order
    .map((kind) => {
      const count = placements.filter((p) => p.kind === kind).length
      return { kind, count, label: `${count} × ${kind} (${LOCATION[kind]})` }
    })
    .filter((l) => l.count > 0)
}
