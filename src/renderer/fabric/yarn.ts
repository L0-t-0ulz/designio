import type { Fabric } from './FabricLibrary'

/**
 * Yarn library — the yarn a fabric is spun from, described the way a spinner
 * grades it, changing the fabric's **hand** (its drape + surface) for real:
 *
 * - **count** (tex, g/km) — how thick the yarn is: lace ~15 · fingering ~30 ·
 *   DK ~60 · worsted ~100 · chunky ~200. Chunkier = heavier cloth, coarser
 *   stitch gauge, deeper surface relief.
 * - **ply** — strands twisted together (1–8): more plies = a rounder, stronger,
 *   crisper yarn; a single ply is soft and drapey.
 * - **twist** — 0 (soft-spun: fuzzy halo, limp) … 1 (crepe: dense, springy);
 *   0.5 is a standard twist.
 *
 * `yarnHand` derives pure multipliers; `yarnAdjustedFabric` applies them to a
 * `Fabric` (clamped to the library's sane ranges), so the same preset fabric
 * knitted from lace-weight vs chunky yarn genuinely drapes and reads
 * differently — physics and PBR both, since everything downstream derives
 * from the adjusted fabric.
 */

export interface YarnSpec {
  /** Yarn thickness in tex (g/km), 10–300. */
  tex: number
  /** Plies twisted together, 1–8. */
  ply: number
  /** Twist level, 0 (soft-spun) … 1 (crepe). */
  twist: number
}

export const DK_TEX = 60 // the reference weight — multipliers are 1 at DK

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

/** Validate a spec (the editor/deep-link can hand us anything). */
export function validateYarn(y: YarnSpec): string | null {
  if (!(y.tex >= 10 && y.tex <= 300)) return 'count must be 10–300 tex'
  if (!Number.isInteger(y.ply) || y.ply < 1 || y.ply > 8) return 'ply must be 1–8'
  if (!(y.twist >= 0 && y.twist <= 1)) return 'twist must be 0–1'
  return null
}

export interface YarnHand {
  /** Areal-weight multiplier — chunkier yarn = heavier cloth. */
  gsmScale: number
  /** Thread/stitch-repeat multiplier — finer yarn = more, smaller stitches. */
  weaveScale: number
  /** Surface-relief multiplier — chunky yarn reads deeper. */
  normalScale: number
  /** Bendiness multiplier — more ply/twist = crisper (springs back), single soft-spun = limper. */
  bendScale: number
  /** Stretch multiplier — a high-twist yarn is springier. */
  stretchScale: number
  /** Roughness delta — soft-spun fuzz is matte, a tight crepe surface is denser/smoother. */
  roughnessDelta: number
  /** Sheen delta — a low-twist halo glows, high twist kills it. */
  sheenDelta: number
}

/** Derive the hand multipliers from a yarn. Pure, monotonic in each input. */
export function yarnHand(y: YarnSpec): YarnHand {
  const texScale = clamp(y.tex / DK_TEX, 0.2, 4) // 1 at DK
  return {
    gsmScale: clamp(Math.pow(texScale, 0.6), 0.5, 2.0),
    weaveScale: clamp(1 / Math.sqrt(texScale), 0.5, 2.2),
    normalScale: clamp(Math.pow(texScale, 0.5), 0.6, 1.8),
    bendScale: clamp(1 - 0.24 * ((y.ply - 2) / 6) - 0.5 * (y.twist - 0.5), 0.45, 1.45),
    stretchScale: clamp(1 + 0.6 * (y.twist - 0.5), 0.7, 1.3),
    roughnessDelta: 0.24 * (0.5 - y.twist),
    sheenDelta: 0.3 * (0.5 - y.twist)
  }
}

/** Apply a yarn's hand to a fabric — physics + PBR fields, clamped sane. Pure. */
export function yarnAdjustedFabric(f: Fabric, y?: YarnSpec): Fabric {
  if (!y || validateYarn(y)) return f
  const hand = yarnHand(y)
  return {
    ...f,
    gsm: clamp(f.gsm * hand.gsmScale, 40, 800),
    bendiness: clamp(f.bendiness * hand.bendScale, 0.05, 1),
    stretch: clamp(f.stretch * hand.stretchScale, 0, 1),
    weaveScale: clamp(Math.round(f.weaveScale * hand.weaveScale), 30, 400),
    normalStrength: clamp(f.normalStrength * hand.normalScale, 0.1, 1.5),
    roughness: clamp(f.roughness + hand.roughnessDelta, 0.05, 1),
    sheen: clamp(f.sheen + hand.sheenDelta, 0, 1)
  }
}

// ---- presets — the hand-knitting weights + spin styles, as data ----

export type YarnPresetId = 'lace' | 'fingering' | 'dk' | 'worsted' | 'chunky' | 'single-ply' | 'crepe'

export interface YarnPreset {
  id: YarnPresetId
  name: string
  yarn: YarnSpec
}

export const YARN_PRESETS: YarnPreset[] = [
  { id: 'lace', name: 'Lace', yarn: { tex: 15, ply: 2, twist: 0.5 } },
  { id: 'fingering', name: 'Fingering', yarn: { tex: 30, ply: 3, twist: 0.5 } },
  { id: 'dk', name: 'DK', yarn: { tex: 60, ply: 4, twist: 0.5 } },
  { id: 'worsted', name: 'Worsted', yarn: { tex: 100, ply: 4, twist: 0.5 } },
  { id: 'chunky', name: 'Chunky', yarn: { tex: 200, ply: 3, twist: 0.35 } },
  // spin styles at DK weight — the soft halo single vs the springy crepe
  { id: 'single-ply', name: 'Single-ply (soft)', yarn: { tex: 60, ply: 1, twist: 0.2 } },
  { id: 'crepe', name: 'Crepe (springy)', yarn: { tex: 45, ply: 2, twist: 0.9 } }
]

export const yarnPreset = (id: string): YarnPreset | undefined => YARN_PRESETS.find((p) => p.id === id)

/** One-line label for the panel ("DK · 4-ply · std twist"). */
export function yarnLabel(y: YarnSpec): string {
  const preset = YARN_PRESETS.find((p) => p.yarn.tex === y.tex && p.yarn.ply === y.ply && p.yarn.twist === y.twist)
  const twist = y.twist < 0.35 ? 'soft' : y.twist > 0.65 ? 'high' : 'std'
  return preset ? preset.name : `${y.tex} tex · ${y.ply}-ply · ${twist} twist`
}
