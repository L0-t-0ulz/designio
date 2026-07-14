import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentParams, SleeveShape, SleeveStyle } from '../garment/templates'
import {
  buildAxisTube,
  buildScarf,
  buildTubeGarment,
  fillAxisTube,
  fillScarf,
  fillTube,
  openSeamColumn,
  type AxisTubeSpec,
  type ScarfSpec,
  type TubeBuild,
  type TubeCutout,
  type TubeSpec
} from '../cloth/Garment'
import type { BalaclavaFace, BodyTubePiece, GarmentDefinition, HeadTubePiece, ScarfPiece } from './schema'
import { simTube, getResolutionScale, type SimResolution } from '../cloth/simQuality'

const RADIAL = 60
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

// Global simulation-resolution scale (denser garments — higher particle counts).
let simScale = 1
/** Set the sim resolution used when garments are (re)built. */
export function setSimResolution(name: SimResolution): void {
  simScale = getResolutionScale(name)
}

/** One tube piece; `rings`/`radial` scaled to its height + the sim resolution.
 *  `divisor` = metres-per-ring the piece is authored at (smaller = denser rings —
 *  short pieces like a cowl need it to drape + stay above the solver's ring minimum). */
function piece(
  topY: number,
  bottomY: number,
  radiusTop: number,
  radiusBottom: number,
  centerX = 0,
  radial = RADIAL,
  divisor = 0.022
): TubeSpec {
  const h = Math.max(0.05, topY - bottomY)
  const t = simTube(radial, h, divisor, simScale)
  return { rings: t.rings, radial: t.radial, topY, bottomY, radiusTop, radiusBottom, centerX }
}

/** A torso/dress/skirt tube from a `bodyTube` piece + the live measurements. */
function bodyTubeToSpec(pc: BodyTubePiece, p: GarmentParams, m: Measurements): TubeSpec {
  const topY = pc.topAnchor === 'shoulder' ? m.shoulderY : m.waistY
  const hemDrop = pc.hemDropHi + (pc.hemDropLo - pc.hemDropHi) * p.length - (p.hem ? 0.03 : 0) + (p.lengthGradeM ?? 0) // rolled hem = shorter; grade rules drop/raise the hem per size
  const hemY = Math.max(0.14, topY - hemDrop)
  const rTop = pc.topR === 'chest' ? m.chestR + p.ease + (p.easeChest ?? 0) : m.waistR + p.ease + (p.easeWaist ?? 0)
  const hipBase = pc.botR === 'chest90' ? m.chestR * 0.9 : pc.botR === 'hip90' ? m.hipR * 0.9 : m.hipR
  const pleatBoost = p.pleats ? 0.07 : 0 // fuller, pleated hem
  const rBot = hipBase + p.ease + (pc.botR === 'chest90' ? p.easeChest ?? 0 : p.easeHip ?? 0) + p.flare * (pc.flareScale ?? 1) + pleatBoost
  // short pieces (a bra band, a high-rise panel) get denser rings so they still drape
  const spec = piece(topY, hemY, rTop, rBot, 0, RADIAL, topY - hemY < 0.4 ? 0.015 : 0.022)
  if (pc.neckline) {
    spec.neckline = p.collar ? 'crew' : (p.neckline ?? 'scoop') // a collar closes/raises the neck
    spec.shoulderY = m.shoulderY
  }
  // Waist shaping: cinch by construction, or add darts for a fitted waist.
  if (pc.cinchWaist || p.dart) {
    const nip = p.dart ? 0.86 : 1 // darts pull the waist in further
    spec.radiusWaist = m.waistR * nip + p.ease * (p.dart ? 0.4 : 0.6) + (p.easeWaist ?? 0)
    spec.waistT = clamp((topY - m.waistY) / (topY - hemY), 0.2, 0.7)
  }
  if (p.pleats) spec.pleat = p.pleatStyle ?? 'knife'
  if (p.hemShape && p.hemShape !== 'straight') spec.hemShape = p.hemShape // curved hem (high-low · shirttail · handkerchief)
  // A worn-open closure splits the centre-front seam (only the torso piece has the placket).
  if (p.closure && p.closureOpen && pc.neckline) spec.openFront = true
  // Boning cinches the waist hard (corset silhouette) — overrides any softer cinch.
  if (p.boning) {
    spec.radiusWaist = m.waistR * 0.8 + p.ease * 0.25 + (p.easeWaist ?? 0)
    spec.waistT = clamp((topY - m.waistY) / (topY - hemY), 0.2, 0.72)
  }
  return spec
}

/**
 * A head/neck tube (cowl · snood · gaiter · beanie) from a `headTube` piece. Anchored
 * at the crown or neck, running down over the head/neck; radii read from the head/neck
 * measurements. It collides with the head/neck capsules for free (they're in the solver's
 * collider set), so it drapes onto the neck/shoulders.
 */
export function headTubeToSpec(pc: HeadTubePiece, p: GarmentParams, m: Measurements): TubeSpec {
  const crown = pc.anchor === 'crown'
  const baseY = crown ? m.neckY + m.headR * 2.7 : m.neckY // ≈ the visual crown, or the neck base
  const baseR = crown ? m.headR : m.neckR
  const topY = baseY + (pc.riseHi ?? 0)
  const drop = pc.dropHi + (pc.dropLo - pc.dropHi) * p.length
  const bottomY = Math.max(m.chestY - 0.03, topY - drop) // never past the upper chest
  const rTop = baseR * pc.topScale + p.ease
  const rBot = baseR * pc.botScale + p.ease + p.flare
  const spec = piece(topY, bottomY, rTop, rBot, 0, 44, 0.013) // denser rings — a short piece still drapes
  const face = pc.face && (p.faceStyle ?? pc.face)
  if (face) {
    // a face style implies full-head coverage: belly the tube out at face height so
    // it spawns just off the face (not inside the head) and narrows to the neck
    spec.radiusWaist = baseR * 1.06 + p.ease
    spec.waistT = 0.34
    const cuts = balaclavaCutouts(face, topY, bottomY, m)
    if (cuts.length) spec.cutouts = cuts
  }
  return spec
}

/**
 * The balaclava's face openings as tube cut-outs — eye holes on the front
 * (centre-front is u = 0.25), a mouth hole below, or one open-face oval; sized
 * from the head radius so they land on the eye/mouth lines of any figure. Pure.
 */
export function balaclavaCutouts(face: BalaclavaFace, topY: number, bottomY: number, m: Measurements): TubeCutout[] {
  if (face === 'full') return []
  const span = Math.max(0.05, topY - bottomY)
  const v = (y: number): number => Math.min(0.94, Math.max(0.06, (topY - y) / span))
  const eyeY = m.neckY + m.headR * 1.9 // the eye line up the head
  const mouthY = m.neckY + m.headR * 1.05
  const eyeHalf = (m.headR * 0.18) / span // half-heights as v spans
  const mouthHalf = (m.headR * 0.16) / span
  const U = 0.25
  if (face === 'open-face') {
    return [{ u0: U - 0.085, u1: U + 0.085, v0: v(eyeY) - eyeHalf * 1.4, v1: v(mouthY) + mouthHalf * 1.6 }]
  }
  const eyes: TubeCutout[] = [
    { u0: U - 0.095, u1: U - 0.022, v0: v(eyeY) - eyeHalf, v1: v(eyeY) + eyeHalf },
    { u0: U + 0.022, u1: U + 0.095, v0: v(eyeY) - eyeHalf, v1: v(eyeY) + eyeHalf }
  ]
  if (face === 'eyes') return eyes
  return [...eyes, { u0: U - 0.05, u1: U + 0.05, v0: v(mouthY) - mouthHalf, v1: v(mouthY) + mouthHalf }]
}

/** A flat scarf panel spec (wrapped once around the neck, tails hanging) from a `scarfPanel` piece. */
export function scarfToSpec(pc: ScarfPiece, p: GarmentParams, m: Measurements): ScarfSpec {
  const wrapR = m.neckR + pc.wrapEase + p.ease
  const tailLen = pc.tailHi + (pc.tailLo - pc.tailHi) * p.length
  const width = pc.width
  const len = 1.3 * Math.PI * wrapR + 2 * tailLen // ≈ total centreline length (~234° wrap + tails)
  const nx = Math.max(24, Math.min(120, Math.round((len / 0.02) * simScale)))
  const ny = Math.max(4, Math.min(24, Math.round((width / 0.03) * simScale)))
  // tails hang in front of the chest, clear of the torso capsule
  return { nx, ny, neckY: m.neckY, wrapR, width, tailLen, tailZ: m.chestR + 0.04 }
}

/** The two trouser legs (hip → knee/ankle by length). */
function legTubeSpecs(p: GarmentParams, m: Measurements): TubeSpec[] {
  const breakDrop = p.trouserBreak ? 0.028 : 0 // break: the hem runs past the ankle and stacks softly
  const hemY = m.kneeY - p.length * (m.kneeY - m.ankleY) + (p.hem ? 0.03 : 0) - (p.lengthGradeM ?? 0) - breakDrop // rolled hem = shorter leg; grade rules lengthen per size
  const rTop = m.thighR + p.ease + (p.easeHip ?? 0) // the hip/seat zone governs the leg top
  const rBot = m.thighR * 0.6 + p.ease * 0.6 + p.flare * 0.4 + (p.pleats ? 0.05 : 0)
  const legs = [
    piece(m.hipY, hemY, rTop, rBot, -m.hipHalfX, 40),
    piece(m.hipY, hemY, rTop, rBot, m.hipHalfX, 40)
  ]
  if (p.crease) for (const leg of legs) leg.crease = true // pressed fore/aft crease per leg
  if (p.pleats) for (const l of legs) l.pleat = p.pleatStyle ?? 'knife'
  return legs
}

/**
 * The sleeve **library** — maps a shape to its radius endpoints + an optional
 * non-linear profile along the sleeve (t = shoulder … cuff). Pure so it's unit
 * tested. `armR` = the arm radius at the hem (forearm for long, upper for short).
 */
export function sleeveShapeSpec(
  shape: SleeveShape,
  shoulderR: number, // the upper-arm radius (the sleeve cap sits over the shoulder)
  hemR: number, // the arm radius at the hem (forearm for long, upper-arm for short)
  cuff: boolean
): { radiusStart: number; radiusEnd: number; profile?: (t: number) => number } {
  // Everything is expressed as a MULTIPLE of the arm radius (not absolute metres) so a sleeve
  // reads the same — and stays stable — on any body size. Bulges are kept modest so the puff
  // gather can't balloon into a self-intersecting ring that the solver blows up.
  const base = hemR + (cuff ? 0.004 : 0.02) // cuff / hem radius: a little ease over the arm
  const lerp = (s: number, e: number, t: number): number => s + (e - s) * t
  switch (shape) {
    case 'raglan': // seam runs to the neck → a wider top over the shoulder
      return { radiusStart: shoulderR * 1.7, radiusEnd: base }
    case 'dolman': { // batwing — very wide, deep armhole tapering to the wrist
      const start = shoulderR * 3.4
      return { radiusStart: start, radiusEnd: base, profile: (t) => start + (base - start) * Math.pow(t, 1.5) }
    }
    case 'bishop': { // full sleeve, gathered into a tight cuff
      const end = hemR + 0.004
      const start = shoulderR * 1.4
      const bulge = shoulderR * 0.7 // a modest mid-sleeve gather (was a fixed 0.05 m → too full)
      return { radiusStart: start, radiusEnd: end, profile: (t) => lerp(start, end, t) + bulge * Math.sin(Math.PI * Math.min(t / 0.94, 1)) }
    }
    case 'puff': { // gathered puff at the shoulder, normal below
      const start = shoulderR * 1.3
      const bulge = shoulderR * 0.6 // cap ≈ 1.9× the arm — a soft puff, not the old ~4× balloon
      // spread the gather over the top ~45% of the sleeve so the cap reads round, not a sharp peak
      return { radiusStart: start, radiusEnd: base, profile: (t) => lerp(start, base, t) + bulge * Math.pow(Math.max(0, 1 - t / 0.45), 1.5) }
    }
    case 'bell': { // narrow upper arm, flaring out at the cuff
      const start = shoulderR * 1.15
      const end = hemR + shoulderR * 1.7
      return { radiusStart: start, radiusEnd: end, profile: (t) => start + (end - start) * Math.pow(t, 2.5) }
    }
    default: // set-in — hugs the shoulder/arm, tapers to the hem
      return { radiusStart: shoulderR * 1.35, radiusEnd: base }
  }
}

/** Sleeve tubes along the arm capsules (indices 5/6 = left, 9/10 = right). */
function sleeveSpecs(style: SleeveStyle, colliders: Capsule[], cuff = false, shape: SleeveShape = 'set-in', gradeM = 0): AxisTubeSpec[] {
  const arms: [Capsule, Capsule][] = [
    [colliders[5], colliders[6]],
    [colliders[9], colliders[10]]
  ]
  return arms.map(([upper, fore]) => {
    // Sleeve stops along the arm chain: mid-bicep (short) - elbow - 3/4 - bracelet -
    // wrist (long). Dolman/bishop/bell are statement sleeves -> always full length.
    const fullLen = style === 'long' || shape === 'dolman' || shape === 'bishop' || shape === 'bell'
    const b = fullLen
      ? fore.b.clone()
      : style === 'elbow'
        ? fore.a.clone()
        : style === 'three-quarter'
          ? fore.a.clone().lerp(fore.b, 0.5)
          : style === 'bracelet'
            ? fore.a.clone().lerp(fore.b, 0.85)
            : upper.a.clone().lerp(upper.b, 0.62) // short - a true mid-bicep cap
    // Start the cap lifted up + inboard over the deltoid (toward the shoulder line / neck) so
    // the sleeve overlaps the body's shoulder and closes the bare armhole gap — the body and
    // sleeve are separate meshes with no seam, so without this overlap the deltoid shows through.
    const rr = upper.radius
    const a = upper.a.clone()
    a.y += rr * 0.7
    a.x += (a.x >= 0 ? -1 : 1) * rr * 0.55
    // grade rules extend/shorten the sleeve along the arm axis (cm per size step)
    if (gradeM) b.add(b.clone().sub(a).normalize().multiplyScalar(gradeM))
    const len = a.distanceTo(b)
    const past = style === 'elbow' || style === 'three-quarter' || style === 'bracelet' // stops past the elbow taper toward the wrist
    const { radiusStart, radiusEnd, profile } = sleeveShapeSpec(shape, upper.radius, fullLen || past ? fore.radius : upper.radius, cuff)
    const t = simTube(26, len, 0.03, simScale)
    return { rings: t.rings, radial: t.radial, a, b, radiusStart, radiusEnd, profile }
  })
}

/** The tube specs (body + legs, excluding sleeves) — for inspection + tests. */
export function garmentTubeSpecs(def: GarmentDefinition, params: GarmentParams, m: Measurements): TubeSpec[] {
  const specs: TubeSpec[] = []
  for (const pc of def.pieces) {
    if (pc.kind === 'bodyTube') specs.push(bodyTubeToSpec(pc, params, m))
    else if (pc.kind === 'legTubes') specs.push(...legTubeSpecs(params, m))
    else if (pc.kind === 'headTube') specs.push(headTubeToSpec(pc, params, m))
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
  return sleeve === 'none' ? [] : sleeveSpecs(sleeve, colliders, params.cuff, params.sleeveShape, params.sleeveGradeM ?? 0)
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
  /** Head/neck tubes (cowl · snood · beanie); their flat pattern is a later card. */
  head: TubeSpec[]
}
export function garmentPatternSpecs(
  def: GarmentDefinition,
  params: GarmentParams,
  m: Measurements,
  colliders: Capsule[]
): PatternSpecs {
  const body: TubeSpec[] = []
  const legs: TubeSpec[] = []
  const head: TubeSpec[] = []
  for (const pc of def.pieces) {
    if (pc.kind === 'bodyTube') body.push(bodyTubeToSpec(pc, params, m))
    else if (pc.kind === 'legTubes') legs.push(legTubeSpecs(params, m)[0]) // one leg; mirror is cut 2
    else if (pc.kind === 'headTube') head.push(headTubeToSpec(pc, params, m))
  }
  return { body, legs, head, sleeves: garmentSleeveSpecs(def, params, colliders) }
}

/** A ready-to-simulate garment piece (geometry + how to reset it + a display name). */
export interface SimPiece {
  build: TubeBuild
  refill: (pos: Float32Array) => void
  name: string
  /** false for a flat open panel (a scarf) — the solver must not wrap X. Default true (tubes). */
  wrapX?: boolean
  /** Functional opening: cut the solver seam at this column boundary (open placket/zip). */
  cutCol?: number
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
      out.push({ build: buildTubeGarment(spec), refill: (pos) => fillTube(pos, spec), name: 'Body', cutCol: spec.openFront ? openSeamColumn(spec.radial) : undefined })
    } else if (pc.kind === 'legTubes') {
      legTubeSpecs(params, m).forEach((spec, i) => {
        out.push({ build: buildTubeGarment(spec), refill: (pos) => fillTube(pos, spec), name: legName[i] })
      })
    } else if (pc.kind === 'sleeves') {
      const sleeve = params.sleeve ?? 'none'
      if (sleeve !== 'none') {
        sleeveSpecs(sleeve, colliders, params.cuff, params.sleeveShape, params.sleeveGradeM ?? 0).forEach((spec, i) => {
          out.push({ build: buildAxisTube(spec), refill: (pos) => fillAxisTube(pos, spec), name: sleeveName[i] })
        })
      }
    } else if (pc.kind === 'headTube') {
      const spec = headTubeToSpec(pc, params, m)
      out.push({ build: buildTubeGarment(spec), refill: (pos) => fillTube(pos, spec), name: pc.anchor === 'crown' ? 'Head' : 'Cowl' })
    } else if (pc.kind === 'scarfPanel') {
      const spec = scarfToSpec(pc, params, m)
      out.push({ build: buildScarf(spec), refill: (pos) => fillScarf(pos, spec), name: 'Scarf', wrapX: false })
    }
  }
  return out
}
