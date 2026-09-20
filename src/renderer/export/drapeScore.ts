/**
 * **Drape score** — how much the garment stands away from the body, measured on
 * the cloth that is actually hanging there.
 *
 * This is the Cusick drape test, read off the garment rather than off a test disc.
 * Cusick clamps a circle of fabric over a smaller disc and photographs its shadow:
 * the **drape coefficient** is how much of the annulus between the clamp and the
 * specimen's full circle survives in the shadow. A stiff fabric keeps nearly all
 * of it and scores near 1; a limp one collapses onto the clamp and scores near 0.
 *
 * A garment's hem is the same measurement with the body as the clamp: the hem's
 * own outline is the shadow, the body's cross-section is the disc, and the
 * undraped hem circumference is the specimen. So
 *
 * ```
 * coefficient = (hem area − body area) / (flat area − body area)
 * ```
 *
 * The other half of the Cusick test is the **node count** — the number of folds
 * around the rim — which is a property of the cloth's bending stiffness and not of
 * how far it stands out, so the two together say more than either alone.
 *
 * Pure + unit-tested.
 */

export interface RimPoint {
  x: number
  z: number
}

export interface DrapeScore {
  /** 0…1: 0 clings to the body, 1 stands out as stiffly as the pattern allows. */
  coefficient: number
  /** Folds around the hem — the Cusick node count. */
  nodes: number
  /** Mean fold depth as a fraction of the mean hem radius. */
  foldDepth: number
  /** Mean hem radius, m — the raw measurement the rest is derived from. */
  meanRadiusM: number
}

/** Shoelace area of a closed rim, m². */
export function rimArea(rim: readonly RimPoint[]): number {
  if (rim.length < 3) return 0
  let a = 0
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length
    a += rim[i].x * rim[j].z - rim[j].x * rim[i].z
  }
  return Math.abs(a) / 2
}

/** Radii of a rim about a centre. */
export function rimRadii(rim: readonly RimPoint[], cx = 0, cz = 0): number[] {
  return rim.map((p) => Math.hypot(p.x - cx, p.z - cz))
}

/**
 * Count the folds in a rim: how many times its radius peaks, read as a closed loop.
 *
 * A **hysteresis state machine**, not a neighbour comparison. Comparing each
 * sample with its neighbours counts every sample of a rounded peak, so a fold
 * spanning twenty samples is counted twenty times and the node count tracks the
 * mesh resolution rather than the cloth — which is exactly what the first version
 * did, reporting 27 folds on a rim with 3.
 *
 * Instead: walk the loop tracking whether the radius is rising or falling, and
 * only switch direction once it has moved `threshold` of the mean radius away from
 * the last extreme. Each fold then counts once however many samples it spans, and
 * the deadband means numerical ripple in a smooth hem is not a fold.
 *
 * The walk starts at the global minimum, so the loop's seam falls in a trough
 * where it cannot manufacture or hide a peak.
 */
export function countNodes(radii: readonly number[], threshold = 0.004): number {
  const n = radii.length
  if (n < 6) return 0
  const mean = radii.reduce((a, b) => a + b, 0) / n
  const eps = mean * threshold
  if (eps <= 0) return 0
  let start = 0
  for (let i = 1; i < n; i++) if (radii[i] < radii[start]) start = i
  let rising = true
  let extreme = radii[start]
  let nodes = 0
  for (let k = 1; k <= n; k++) {
    const r = radii[(start + k) % n]
    if (rising) {
      if (r > extreme) extreme = r
      else if (extreme - r > eps) {
        nodes++ // we have come back down off a peak: that was one fold
        rising = false
        extreme = r
      }
    } else {
      if (r < extreme) extreme = r
      else if (r - extreme > eps) {
        rising = true
        extreme = r
      }
    }
  }
  return nodes
}

/**
 * Score the drape of one hem.
 *
 * `flatCircumferenceM` is the hem's **pattern** length — how long it would be laid
 * flat — which is what the fabric has available to stand out with. `bodyRadiusM`
 * is the body at that height, which is what it collapses onto.
 */
export function drapeScore(rim: readonly RimPoint[], flatCircumferenceM: number, bodyRadiusM: number, cx = 0, cz = 0): DrapeScore {
  const radii = rimRadii(rim, cx, cz)
  const meanR = radii.length ? radii.reduce((a, b) => a + b, 0) / radii.length : 0
  const hemArea = rimArea(rim)
  const bodyArea = Math.PI * bodyRadiusM * bodyRadiusM
  const flatR = flatCircumferenceM / (2 * Math.PI)
  const flatArea = Math.PI * flatR * flatR
  const span = flatArea - bodyArea
  // A hem cut no bigger than the body it is on has nothing to drape: the test is
  // undefined there, and reporting 0 would read as "perfectly limp" rather than
  // "not applicable".
  const coefficient = span > 1e-9 ? clamp01((hemArea - bodyArea) / span) : 0
  const dev = radii.length ? radii.reduce((a, r) => a + Math.abs(r - meanR), 0) / radii.length : 0
  return {
    coefficient: round3(coefficient),
    nodes: countNodes(radii),
    foldDepth: meanR > 1e-9 ? round3(dev / meanR) : 0,
    meanRadiusM: round3(meanR)
  }
}

/**
 * Score a hem without being told its pattern length, by taking the specimen circle
 * to be the one the hem's **own perimeter** would enclose if it hung round.
 *
 * This is the isoperimetric reading of the same test, and it is the honest one
 * when the pattern length is not to hand: a hem that has fallen into folds has
 * the same perimeter and encloses less area, which is exactly what a drape
 * coefficient measures.
 */
export function drapeScoreOfRim(rim: readonly RimPoint[], bodyRadiusM: number, cx = 0, cz = 0): DrapeScore {
  let per = 0
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length
    per += Math.hypot(rim[j].x - rim[i].x, rim[j].z - rim[i].z)
  }
  return drapeScore(rim, per, bodyRadiusM, cx, cz)
}

/** How the score reads to a person. */
export function drapeLabel(d: DrapeScore): string {
  const pct = Math.round(d.coefficient * 100)
  if (d.coefficient < 0.25) return `Clinging (${pct}%)`
  if (d.coefficient < 0.5) return `Soft (${pct}%)`
  if (d.coefficient < 0.75) return `Full (${pct}%)`
  return `Stiff (${pct}%)`
}

/** A one-line readout for the panel. */
export function drapeReadout(d: DrapeScore): string {
  return `${drapeLabel(d)} · ${d.nodes} fold${d.nodes === 1 ? '' : 's'}`
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const round3 = (v: number): number => Math.round(v * 1000) / 1000
