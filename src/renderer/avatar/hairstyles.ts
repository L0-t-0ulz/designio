/**
 * **Hairstyle geometry** — the parts of a style that are shape rather than a shell.
 *
 * The existing styles are all one bowl and an optional curtain, which is enough for
 * a crop, a bob and a fall. The four here are not:
 *
 * - **cornrows** are discrete rows braided flat to the scalp, running front to back,
 *   with scalp showing between them — the partings are as much of the style as the
 *   braids are;
 * - a **bun** is a rope coiled on itself at one point;
 * - a **ponytail** is gathered at one point and hangs from it, swinging out under
 *   its own weight rather than dropping straight;
 * - a **pixie** is a crop that follows the skull, which is a different thing from a
 *   short bowl standing off it.
 *
 * All of it is authored in the same unit head frame as `face.ts` — origin at the
 * collider crown, +y up, +z the face — and against the same scalp the bowl uses, so
 * a gathered style meets the cap it is gathered from.
 *
 * Pure + unit-tested.
 */

/** The scalp the bowl cap is built on, which everything here has to agree with. */
export const SCALP_CENTRE: [number, number, number] = [0, 0.35, -0.05]
export const SCALP_SCALE: [number, number, number] = [1.02, 1.68, 1.08]
export const SCALP_R = 1.1
/** Polar angle of the hairline — the bowl's own, so a row starts where the cap does. */
export const HAIRLINE = Math.PI * 0.63

/* --------------------------------- cornrows -------------------------------- */

/**
 * The lateral offset of cornrow `i` of `n`, in scalp radii from the centre parting.
 *
 * Cornrows are **parallel** rows running front to back, so each one lies in its own
 * plane a fixed distance to one side — the planes are parallel, and the rows never
 * meet.
 *
 * Tilting a great circle instead is the obvious construction and it is wrong: every
 * tilted great circle passes through the same two points, so the rows converge at
 * the front and the back and the style renders as a fan. Which is what the first
 * version did.
 *
 * Spread symmetrically about the centre parting and stopping short of the side of
 * the head, because there is no scalp beyond the last row.
 */
export const CORNROW_SPREAD = 0.78
export function cornrowOffset(i: number, n: number): number {
  if (n <= 1) return 0
  return (i / (n - 1) - 0.5) * 2 * CORNROW_SPREAD
}

/**
 * A point on the row at lateral `offset`, at `t` from the hairline (0) to the nape
 * (1), on the unit scalp sphere before the scalp's own scale is applied.
 *
 * The row is the intersection of its plane with the scalp: a **small** circle, whose
 * radius shrinks the further out the row sits. That is why the outer rows are
 * shorter, and it falls out of the geometry rather than being applied to it.
 */
export function cornrowPoint(offset: number, t: number): { x: number; y: number; z: number } {
  const u = Math.min(1, Math.max(0, t))
  const x = Math.min(0.999, Math.max(-0.999, offset))
  const r = Math.sqrt(1 - x * x) // the small circle this row runs on
  const a = HAIRLINE - u * (HAIRLINE + Math.PI * 0.42) // hairline → over the crown → nape
  return { x, y: r * Math.cos(a), z: r * Math.sin(a) }
}

/**
 * A braid's radius at `t` along it, as a fraction of its nominal.
 *
 * A braid is not a smooth tube: it swells and pinches once per crossing. `pitch` is
 * how many crossings the row has, and the swell is shallow — a braid reads by its
 * rhythm, not by being lumpy.
 */
export function braidRadius(t: number, pitch = 14, depth = 0.22): number {
  return 1 + depth * Math.sin(t * pitch * Math.PI * 2)
}

/** A cornrow tapers toward the nape, where it is gathered off the head. */
export function cornrowTaper(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return 1 - 0.35 * u * u
}

/* ----------------------------------- bun ----------------------------------- */

/**
 * A point on a bun's coil at `t` around it, in head radii from the bun's centre.
 *
 * A bun is a rope wound on itself, so it is a spiral in a plane with the rope's own
 * thickness standing off it — not a torus, which has a hole a real bun does not.
 * The spiral tightens toward the centre and the whole thing is domed, because the
 * later turns sit on top of the earlier ones.
 */
export function bunCoil(t: number, turns = 2.6, radius = 0.42): { x: number; y: number; z: number } {
  const u = Math.min(1, Math.max(0, t))
  const a = u * turns * Math.PI * 2
  // wound from the outside in, so the free end finishes hidden at the centre
  const r = radius * (1 - 0.72 * u)
  return { x: Math.cos(a) * r, y: 0.18 * radius * u, z: Math.sin(a) * r }
}

/* -------------------------------- ponytail --------------------------------- */

/**
 * A point down a ponytail at `t` from the gather (0) to the tip (1), in head radii.
 *
 * It does not hang straight. A tail leaves the gather along the back of the head,
 * swings **out** as it clears the skull, then falls — the shape a rope takes when
 * it is held at one end against a curved surface. Straight down reads as a rope
 * glued to the head.
 */
export function ponytailPoint(t: number, length = 2.6, swing = 0.5): { x: number; y: number; z: number } {
  const u = Math.min(1, Math.max(0, t))
  // out and back over the first third, then dropping
  const out = Math.sin(Math.min(1, u * 2.2) * Math.PI * 0.5)
  return { x: 0, y: -length * u * u * 0.85 - length * u * 0.15, z: -swing * out }
}

/** A ponytail thins along its length and finishes in a point. */
export function ponytailRadius(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  // full at the gather, narrowing, then the last fifth tapers away
  if (u < 0.8) return 1 - 0.35 * u
  return (1 - 0.35 * 0.8) * (1 - (u - 0.8) / 0.2)
}

/* ------------------------------ braids & locs ------------------------------ */

export type LockKind = 'braid' | 'loc'

/**
 * Where hanging lock `i` of `n` leaves the scalp, on the unit sphere the cornrows
 * use — before the scalp scale is applied. A ring around the upper cranium, set a
 * little back so the face stays open.
 */
export function lockRoot(i: number, n: number): { x: number; y: number; z: number } {
  const u = n <= 1 ? 0 : i / n
  const a = u * Math.PI * 2
  const x = Math.sin(a) * 0.42
  const z = -0.12 + Math.cos(a) * 0.28
  const y = Math.sqrt(Math.max(0.05, 1 - x * x - z * z)) * 0.45 + 0.12
  return { x, y, z }
}

/**
 * Offset from a lock's root at `t` (0 at the scalp, 1 at the tip), in head radii.
 *
 * Box braids and locs hang. They are not cornrows: a cornrow is a small circle
 * lying on the scalp, and these leave it. `side` is the sign of the root's x, so
 * neighbouring locks lean apart instead of collapsing into one rope.
 */
export function lockHang(t: number, length: number, sway: number, side: number): { x: number; y: number; z: number } {
  const u = Math.min(1, Math.max(0, t))
  const lean = side >= 0 ? 1 : -1
  return {
    x: lean * sway * Math.sin(u * Math.PI) * 0.16,
    y: -length * u,
    z: -0.05 * u
  }
}

/** Locs are cut to slightly different lengths; box braids in one head match. */
export function locLength(i: number, base: number): number {
  const h = ((Math.abs(i) * 17) % 7) / 6
  return base * (0.82 + 0.36 * h)
}

/**
 * Thickness along a hanging lock, as a fraction of its nominal radius.
 *
 * A box braid keeps the cornrow's crossing rhythm and finishes in a short taper.
 * A loc is smoother — a gentle mid-shaft swell and a blunt tip — which is how the
 * two read as different hair from across the studio.
 */
export function lockThickness(t: number, kind: LockKind): number {
  const u = Math.min(1, Math.max(0, t))
  if (kind === 'braid') {
    const tip = u < 0.9 ? 1 : 1 - ((u - 0.9) / 0.1) * 0.55
    return braidRadius(u, 10, 0.28) * tip
  }
  const belly = 1 + 0.1 * Math.sin(u * Math.PI)
  const tip = u < 0.88 ? 1 : 1 - ((u - 0.88) / 0.12) * 0.35
  return belly * tip
}
