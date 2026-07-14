/**
 * The **baker boy** (newsboy) — the 8-panel puffed crown over the flat-cap
 * base: a wide low dome whose rim scallops into gore lobes, worn with the
 * cap's short bill. Pure unit-head-frame math consumed by the accessory
 * builder.
 */
export const BAKERBOY = {
  crownR: 1.32, // the puffed overhang — much wider than the head
  crownYScale: 0.62,
  gores: 8,
  /** Radial lobe amplitude at the crown's equator. */
  puff: 0.07
}

/**
 * The gore-lobe field (0…1) at azimuth `az`: one rounded bulge per panel —
 * `gores` maxima around the crown, pinched to 0 at each panel seam. Pure.
 */
export function goreLobe(az: number, gores = BAKERBOY.gores): number {
  return Math.abs(Math.sin((gores / 2) * az))
}
