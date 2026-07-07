import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentParams, SleeveShape } from '../garment/templates'
import {
  buildAxisTube,
  buildTubeGarment,
  fillAxisTube,
  fillTube,
  type AxisTubeSpec,
  type TubeBuild,
  type TubeSpec
} from '../cloth/Garment'
import type { BodyTubePiece, GarmentDefinition } from './schema'

const RADIAL = 60
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** One tube piece; `rings` scaled to its height for even resolution. */
function piece(
  topY: number,
  bottomY: number,
  radiusTop: number,
  radiusBottom: number,
  centerX = 0,
  radial = RADIAL
): TubeSpec {
  const h = Math.max(0.05, topY - bottomY)
  const rings = Math.max(10, Math.min(60, Math.round(h / 0.022)))
  return { rings, radial, topY, bottomY, radiusTop, radiusBottom, centerX }
}

/** A torso/dress/skirt tube from a `bodyTube` piece + the live measurements. */
function bodyTubeToSpec(pc: BodyTubePiece, p: GarmentParams, m: Measurements): TubeSpec {
  const topY = pc.topAnchor === 'shoulder' ? m.shoulderY : m.waistY
  const hemDrop = pc.hemDropHi + (pc.hemDropLo - pc.hemDropHi) * p.length - (p.hem ? 0.03 : 0) // rolled hem = shorter
  const hemY = Math.max(0.14, topY - hemDrop)
  const rTop = (pc.topR === 'chest' ? m.chestR : m.waistR) + p.ease
  const hipBase = pc.botR === 'hip90' ? m.hipR * 0.9 : m.hipR
  const pleatBoost = p.pleats ? 0.07 : 0 // fuller, pleated hem
  const rBot = hipBase + p.ease + p.flare * (pc.flareScale ?? 1) + pleatBoost
  const spec = piece(topY, hemY, rTop, rBot)
  if (pc.neckline) {
    spec.neckline = p.collar ? 'crew' : (p.neckline ?? 'scoop') // a collar closes/raises the neck
    spec.shoulderY = m.shoulderY
  }
  // Waist shaping: cinch by construction, or add darts for a fitted waist.
  if (pc.cinchWaist || p.dart) {
    const nip = p.dart ? 0.86 : 1 // darts pull the waist in further
    spec.radiusWaist = m.waistR * nip + p.ease * (p.dart ? 0.4 : 0.6)
    spec.waistT = clamp((topY - m.waistY) / (topY - hemY), 0.2, 0.7)
  }
  return spec
}

/** The two trouser legs (hip → knee/ankle by length). */
function legTubeSpecs(p: GarmentParams, m: Measurements): TubeSpec[] {
  const hemY = m.kneeY - p.length * (m.kneeY - m.ankleY) + (p.hem ? 0.03 : 0) // rolled hem = shorter leg
  const rTop = m.thighR + p.ease
  const rBot = m.thighR * 0.6 + p.ease * 0.6 + p.flare * 0.4 + (p.pleats ? 0.05 : 0)
  return [
    piece(m.hipY, hemY, rTop, rBot, -m.hipHalfX, 40),
    piece(m.hipY, hemY, rTop, rBot, m.hipHalfX, 40)
  ]
}

/**
 * The sleeve **library** — maps a shape to its radius endpoints + an optional
 * non-linear profile along the sleeve (t = shoulder … cuff). Pure so it's unit
 * tested. `armR` = the arm radius at the hem (forearm for long, upper for short).
 */
export function sleeveShapeSpec(
  shape: SleeveShape,
  armR: number,
  cuff: boolean
): { radiusStart: number; radiusEnd: number; profile?: (t: number) => number } {
  const base = armR + (cuff ? 0.004 : 0.02) // set-in cuff/hem radius
  const lerp = (s: number, e: number, t: number): number => s + (e - s) * t
  switch (shape) {
    case 'raglan': // seam runs to the neck → a wider top over the shoulder
      return { radiusStart: 0.09, radiusEnd: base }
    case 'dolman': // batwing — very wide, deep armhole tapering to the wrist
      return { radiusStart: 0.15, radiusEnd: base, profile: (t) => 0.15 + (base - 0.15) * Math.pow(t, 1.5) }
    case 'bishop': { // full sleeve, gathered into a tight cuff
      const end = armR + 0.004
      return { radiusStart: 0.072, radiusEnd: end, profile: (t) => lerp(0.072, end, t) + 0.05 * Math.sin(Math.PI * Math.min(t / 0.94, 1)) }
    }
    case 'puff': // gathered puff at the shoulder, normal below
      return { radiusStart: 0.078, radiusEnd: base, profile: (t) => lerp(0.078, base, t) + 0.06 * Math.pow(Math.max(0, 1 - t / 0.34), 1.6) }
    case 'bell': { // narrow upper arm, flaring out at the cuff
      const end = armR + 0.085
      return { radiusStart: 0.062, radiusEnd: end, profile: (t) => 0.062 + (end - 0.062) * Math.pow(t, 2.5) }
    }
    default: // set-in — hugs the shoulder/arm, tapers to the hem
      return { radiusStart: 0.072, radiusEnd: base }
  }
}

/** Sleeve tubes along the arm capsules (indices 5/6 = left, 9/10 = right). */
function sleeveSpecs(long: boolean, colliders: Capsule[], cuff = false, shape: SleeveShape = 'set-in'): AxisTubeSpec[] {
  const arms: [Capsule, Capsule][] = [
    [colliders[5], colliders[6]],
    [colliders[9], colliders[10]]
  ]
  return arms.map(([upper, fore]) => {
    const a = upper.a.clone() // shoulder
    // wrist (long) or a true short sleeve at mid-bicep. Dolman/bishop/bell read as
    // full-length even when "short" (they're statement sleeves) → run to the wrist.
    const fullLen = long || shape === 'dolman' || shape === 'bishop' || shape === 'bell'
    const b = fullLen ? fore.b.clone() : upper.a.clone().lerp(upper.b, 0.62)
    const len = a.distanceTo(b)
    const { radiusStart, radiusEnd, profile } = sleeveShapeSpec(shape, fullLen ? fore.radius : upper.radius, cuff)
    return { rings: Math.max(6, Math.min(28, Math.round(len / 0.03))), radial: 26, a, b, radiusStart, radiusEnd, profile }
  })
}

/** The tube specs (body + legs, excluding sleeves) — for inspection + tests. */
export function garmentTubeSpecs(def: GarmentDefinition, params: GarmentParams, m: Measurements): TubeSpec[] {
  const specs: TubeSpec[] = []
  for (const pc of def.pieces) {
    if (pc.kind === 'bodyTube') specs.push(bodyTubeToSpec(pc, params, m))
    else if (pc.kind === 'legTubes') specs.push(...legTubeSpecs(params, m))
  }
  return specs
}

/** Sleeve axis specs for this garment (empty unless it has sleeves and `sleeve !== 'none'`). */
export function garmentSleeveSpecs(
  def: GarmentDefinition,
  params: GarmentParams,
  colliders: Capsule[]
): AxisTubeSpec[] {
  if (!def.pieces.some((pc) => pc.kind === 'sleeves')) return []
  const sleeve = params.sleeve ?? 'none'
  return sleeve === 'none' ? [] : sleeveSpecs(sleeve === 'long', colliders, params.cuff, params.sleeveShape)
}

/**
 * The construction specs a flat pattern needs, grouped by role. `legs`/`sleeves`
 * are deduped to one (the mirror is "cut 2"). This is the single source the 2D
 * pattern generator unwraps — it never re-derives geometry.
 */
export interface PatternSpecs {
  body: TubeSpec[]
  legs: TubeSpec[]
  sleeves: AxisTubeSpec[]
}
export function garmentPatternSpecs(
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[]
): PatternSpecs {
  const body: TubeSpec[] = []
  const legs: TubeSpec[] = []
  for (const pc of def.pieces) {
    if (pc.kind === 'bodyTube') body.push(bodyTubeToSpec(pc, params, m))
    else if (pc.kind === 'legTubes') legs.push(legTubeSpecs(params, m)[0]) // one leg; mirror is cut 2
  }
  return { body, legs, sleeves: garmentSleeveSpecs(def, params, colliders) }
}

/** A ready-to-simulate garment piece (geometry + how to reset it + a display name). */
export interface SimPiece {
  build: TubeBuild
  refill: (pos: Float32Array) => void
  name: string
}

/**
 * Turn a garment definition + fit params into simulated pieces by composing the
 * tube/sleeve primitives. This is the data-driven replacement for the old
 * hardcoded `buildGarmentSpecs` switch + `GarmentController.sleeveSpecs`.
 */
export function buildGarment(
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[]
): SimPiece[] {
  const out: SimPiece[] = []
  const legName = ['Left leg', 'Right leg']
  const sleeveName = ['Left sleeve', 'Right sleeve']
  for (const pc of def.pieces) {
    if (pc.kind === 'bodyTube') {
      const spec = bodyTubeToSpec(pc, params, m)
      out.push({ build: buildTubeGarment(spec), refill: (pos) => fillTube(pos, spec), name: 'Body' })
    } else if (pc.kind === 'legTubes') {
      legTubeSpecs(params, m).forEach((spec, i) => {
        out.push({ build: buildTubeGarment(spec), refill: (pos) => fillTube(pos, spec), name: legName[i] })
      })
    } else if (pc.kind === 'sleeves') {
      const sleeve = params.sleeve ?? 'none'
      if (sleeve !== 'none') {
        sleeveSpecs(sleeve === 'long', colliders, params.cuff, params.sleeveShape).forEach((spec, i) => {
          out.push({ build: buildAxisTube(spec), refill: (pos) => fillAxisTube(pos, spec), name: sleeveName[i] })
        })
      }
    }
  }
  return out
}
