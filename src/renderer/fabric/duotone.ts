/**
 * **Duotone** finish — a two-tone print: the fabric's tones are remapped onto a
 * ramp between a shadow colour and a highlight colour (the classic duotone /
 * risograph look). It reads best over a textile / pattern / print (there the
 * tonal range is wide), but even a flat garment picks up the tint. The palette +
 * luminance→colour maths are pure (no canvas) so they're unit-tested; the renderer
 * bakes the remap into the albedo behind the prints.
 */
export type DuotoneKind = 'noir' | 'sepia' | 'cyanotype' | 'acid' | 'blush'
export const DUOTONE_KINDS: DuotoneKind[] = ['noir', 'sepia', 'cyanotype', 'acid', 'blush']

/** The (shadow, highlight) colour pair for a duotone preset. Pure. */
export function duotonePalette(kind: DuotoneKind): { dark: number; light: number } {
  switch (kind) {
    case 'sepia':
      return { dark: 0x2a1a0e, light: 0xf2e2c2 }
    case 'cyanotype':
      return { dark: 0x08213f, light: 0xcfeaf5 } // the blueprint blue
    case 'acid':
      return { dark: 0x0d2b1a, light: 0xe8ff3a } // acid-green rave
    case 'blush':
      return { dark: 0x3a1030, light: 0xffd9e6 }
    case 'noir':
    default:
      return { dark: 0x0a0a0e, light: 0xf4f4f6 } // near-black → near-white
  }
}

/** Map a luminance `0…1` onto the dark→light duotone ramp, packed 0xRRGGBB. Pure. */
export function duotoneMap(lum01: number, dark: number, light: number): number {
  const t = lum01 < 0 ? 0 : lum01 > 1 ? 1 : lum01
  const dr = (dark >> 16) & 255
  const dg = (dark >> 8) & 255
  const db = dark & 255
  const lr = (light >> 16) & 255
  const lg = (light >> 8) & 255
  const lb = light & 255
  const r = Math.round(dr + (lr - dr) * t)
  const g = Math.round(dg + (lg - dg) * t)
  const b = Math.round(db + (lb - db) * t)
  return (r << 16) | (g << 8) | b
}

/** Rec-709 relative luminance of an sRGB byte triple, `0…1`. Pure. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * Remap the current albedo canvas to a two-tone duotone ramp in place (renderer).
 * Reads each pixel's luminance and writes back its colour on the preset's ramp.
 */
export function paintDuotone(ctx: CanvasRenderingContext2D, size: number, kind: DuotoneKind): void {
  const { dark, light } = duotonePalette(kind)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const c = duotoneMap(luminance(d[i], d[i + 1], d[i + 2]), dark, light)
    d[i] = (c >> 16) & 255
    d[i + 1] = (c >> 8) & 255
    d[i + 2] = c & 255
  }
  ctx.putImageData(img, 0, 0)
}
