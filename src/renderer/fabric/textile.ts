import * as THREE from 'three'

/** Repeating textile patterns that tile across the whole garment. */
export type TextilePattern = 'stripe' | 'plaid' | 'check' | 'gingham' | 'polka' | 'camo'
export const TEXTILE_PATTERNS: TextilePattern[] = ['stripe', 'plaid', 'check', 'gingham', 'polka', 'camo']

/**
 * The pattern's tonal value at a normalized position within one repeat tile —
 * `0` = base colour … `1` = the contrast tone (intermediate values pick tones in
 * between). Pure + periodic (wraps every tile), so it's unit tested; the renderer
 * bakes it into a tiling canvas.
 */
export function textileValue(pattern: TextilePattern, u: number, v: number): number {
  u -= Math.floor(u)
  v -= Math.floor(v)
  switch (pattern) {
    case 'stripe':
      return u < 0.5 ? 0 : 1
    case 'check':
      return u < 0.5 !== v < 0.5 ? 1 : 0
    case 'gingham': // two overlapping stripe sets → 3 tones
      return ((u < 0.5 ? 1 : 0) + (v < 0.5 ? 1 : 0)) / 2
    case 'polka': {
      const dx = u - 0.5
      const dy = v - 0.5
      return dx * dx + dy * dy < 0.05 ? 1 : 0
    }
    case 'plaid': {
      const band = (x: number): number => (x < 0.08 || (x > 0.46 && x < 0.54) ? 1 : 0)
      const thin = (x: number): number => ((x > 0.2 && x < 0.24) || (x > 0.72 && x < 0.76) ? 1 : 0)
      const bu = band(u)
      const bv = band(v)
      if (bu && bv) return 1
      if (bu || bv) return 0.66
      if (thin(u) || thin(v)) return 0.33
      return 0
    }
    default: {
      // camo — irregular tonal patches (3 tones)
      const n = Math.sin(u * 7.0) + Math.cos(v * 6.3) + Math.sin((u + v) * 5.5)
      return n > 0.6 ? 1 : n > -0.4 ? 0.5 : 0
    }
  }
}

/** A contrast tone for a base colour — darker + a touch more saturated (tonal print). */
function contrastOf(base: number): THREE.Color {
  const c = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s + 0.08), Math.max(0.05, hsl.l - 0.34))
}

/**
 * Repeat count for a base tiling at a user scale — `scale` > 1 enlarges the motif
 * (fewer, bigger repeats), < 1 shrinks it (more repeats). Clamped 0.25…4. Pure.
 */
export function textileTiles(baseTiles: number, scale = 1): number {
  const s = Math.max(0.25, Math.min(4, scale || 1))
  return Math.max(1, Math.round(baseTiles / s))
}

/**
 * Paint a seamless repeating textile pattern across a 2D canvas (renderer only) —
 * bakes one repeat tile from `textileValue` then tiles it, at a user `scale`
 * (motif size) + `rotation` (degrees) applied to the repeat.
 */
export function paintTextile(ctx: CanvasRenderingContext2D, size: number, pattern: TextilePattern, base: number, tiles = 10, scale = 1, rotation = 0): void {
  const TS = Math.max(24, Math.round(size / textileTiles(tiles, scale)))
  const tile = document.createElement('canvas')
  tile.width = tile.height = TS
  const tctx = tile.getContext('2d')!
  const img = tctx.createImageData(TS, TS)
  const b = new THREE.Color(base)
  const c = contrastOf(base)
  const mix = new THREE.Color()
  for (let y = 0; y < TS; y++) {
    for (let x = 0; x < TS; x++) {
      const val = textileValue(pattern, x / TS, y / TS)
      mix.copy(b).lerp(c, val)
      const i = (y * TS + x) * 4
      img.data[i] = mix.r * 255
      img.data[i + 1] = mix.g * 255
      img.data[i + 2] = mix.b * 255
      img.data[i + 3] = 255
    }
  }
  tctx.putImageData(img, 0, 0)
  const fill = ctx.createPattern(tile, 'repeat')!
  if (rotation && typeof DOMMatrix !== 'undefined' && fill.setTransform) {
    fill.setTransform(new DOMMatrix().rotate(rotation)) // rotate the whole repeat (stripes/plaids on the bias)
  }
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, size, size)
}
