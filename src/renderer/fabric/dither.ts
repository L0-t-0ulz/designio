/**
 * Ordered (Bayer) dithering for baked finish gradients. A smooth base→tone ramp
 * quantised straight to 8-bit shows visible banding (stair-step contours); adding a
 * sub-LSB, position-dependent offset before rounding spreads the quantisation error
 * so the ramp reads smooth. The classic recursive **8×8 Bayer** matrix gives a fixed,
 * deterministic, tiling pattern (no `Math.random`, so bakes are reproducible).
 */

// 8×8 Bayer threshold matrix, values 0…63.
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
]

/**
 * Signed dither offset in **[-0.5, 0.5)** (in 8-bit LSB units) for pixel (x, y).
 * Add it to a channel's `value·255` before rounding. The pattern tiles every 8 px
 * and its mean over one tile is exactly 0, so it perturbs without shifting the tone.
 * Pure.
 */
export function bayerDither(x: number, y: number): number {
  const v = BAYER8[(y & 7) * 8 + (x & 7)]
  return (v + 0.5) / 64 - 0.5
}
