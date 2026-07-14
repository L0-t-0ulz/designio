/**
 * The **boonie hat** — the soft field hat: a low flat crown, a gently-drooping
 * brim that can SNAP UP against the crown on either (or both) sides, and the
 * chin cord. Pure unit-head-frame math consumed by the accessory builder.
 */
export type BoonieSnap = 'none' | 'left' | 'right' | 'both'
export const BOONIE_SNAPS: BoonieSnap[] = ['none', 'left', 'right', 'both']

export const BOONIE = {
  crownR: 1.0,
  crownH: 0.55,
  brimInnerR: 0.98,
  brimOuterR: 1.62
}

const bump = (x: number): number => {
  const c = Math.max(0, x)
  return c * c * c * c // a tight side lobe
}

/**
 * Brim lift (+up) at azimuth `az` (radians from centre-front; +x is the
 * wearer's left at +π/2). Unsnapped the whole brim droops gently; a snapped
 * side sweeps steeply up against the crown while the rest keeps drooping.
 * Pure; bounded.
 */
export function boonieBrimLift(az: number, snap: BoonieSnap): number {
  const left = snap === 'left' || snap === 'both' ? bump(Math.sin(az)) : 0
  const right = snap === 'right' || snap === 'both' ? bump(-Math.sin(az)) : 0
  return -0.14 + 0.78 * Math.max(left, right)
}

/** The chin cord's frame points: brim anchors either side of the face and the
 *  slider bead under the chin (unit head frame — origin at the skull-crown
 *  collider point, the visual cranium centre ≈ +0.35, the chin ≈ −0.6). */
export const CHIN_CORD = {
  // routed a loose ~1.2 radii from the cranium centre — the GLB face (brow ·
  // cheeks · chin) bulges well past the unit sphere, so a taut cord buries
  // itself in the face (it did, in capture review)
  anchorL: { x: -0.88, y: 0.28, z: 0.92 },
  anchorR: { x: 0.88, y: 0.28, z: 0.92 },
  bead: { x: 0, y: -0.95, z: 1.28 },
  tailEnd: { x: 0, y: -1.3, z: 1.22 }
}
