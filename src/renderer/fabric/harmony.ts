import * as THREE from 'three'

/**
 * **Colour harmonies** — classic colour-wheel schemes derived from the current
 * colour: complementary (opposite), analogous (neighbours), triadic (thirds).
 * Hue rotates; saturation/lightness carry over (clamped to stay readable, the
 * same guard the runway line-up uses). Pure + unit-tested; the panel shows one
 * swatch strip per scheme, one click applies.
 */

export interface HarmonyScheme {
  name: string
  colors: number[]
}

const shift = (base: number, deg: number): number => {
  const hsl = { h: 0, s: 0, l: 0 }
  new THREE.Color(base).getHSL(hsl)
  const s = Math.max(0.25, hsl.s)
  const l = Math.min(0.68, Math.max(0.3, hsl.l))
  return new THREE.Color().setHSL((hsl.h + deg / 360 + 1) % 1, s, l).getHex()
}

export function harmonies(base: number): HarmonyScheme[] {
  return [
    { name: 'Complementary', colors: [shift(base, 180)] },
    { name: 'Analogous', colors: [shift(base, -30), shift(base, 30)] },
    { name: 'Triadic', colors: [shift(base, 120), shift(base, 240)] }
  ]
}
