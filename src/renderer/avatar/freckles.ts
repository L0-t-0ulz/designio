/**
 * **Freckles** — the malar scatter across the nose and upper cheeks.
 *
 * Ephelides do not land uniformly. They follow sun exposure, which on a face means
 * the bridge of the nose and the tops of the cheeks — the "butterfly" or malar
 * distribution — thinning out toward the jaw and the temples and stopping at the
 * eye sockets, which are shaded. A uniform sprinkle over a face reads as dirt.
 *
 * The scatter is deterministic from a seed, so a face keeps its own freckles
 * across a rebuild, a resize and a reload rather than re-rolling them every time
 * the avatar is touched.
 */

/** Face-local coordinates: x across (−1 outer cheek … +1 outer cheek), y up (0 nose base … 1 eye line). */
export interface Freckle {
  x: number
  y: number
  /** **Radius**, as a fraction of the field width. Ephelides are 1–4 mm ACROSS. */
  r: number
  /** 0…1 — how dark this one is. A freckled face is not uniformly speckled. */
  strength: number
}

/** Freckle diameters in mm, the range dermatology gives for ephelides. */
export const FRECKLE_MIN_MM = 1
export const FRECKLE_MAX_MM = 4

/** How wide the field is across the face, in mm — nose bridge plus both malars. */
export const FIELD_WIDTH_MM = 95
export const FIELD_HEIGHT_MM = 38

/** A cheap deterministic hash, so a seed always produces the same face. */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Density of the malar distribution at a face-local point, 0…1.
 *
 * Highest across the nose bridge and the cheekbones, falling off toward the
 * temples and the jaw, and **cut out at the eye sockets** — which are shaded, so
 * they do not freckle, and a freckle drawn on an eyeball is the single most
 * obvious way to get this wrong.
 */
export function malarDensity(x: number, y: number): number {
  const ax = Math.abs(x)
  if (ax > 1 || y < 0 || y > 1) return 0
  // the butterfly: dense on the bridge, dense again over each cheekbone, thinner between
  const bridge = Math.exp(-(ax * ax) / 0.06)
  const cheek = Math.exp(-((ax - 0.58) * (ax - 0.58)) / 0.1)
  let d = Math.min(1, bridge * 0.9 + cheek)
  // fading down toward the jaw
  d *= 0.35 + 0.65 * y
  // the eye sockets sit above the cheekbone and are shaded
  const eye = Math.exp(-((ax - 0.52) * (ax - 0.52)) / 0.045 - ((y - 0.95) * (y - 0.95)) / 0.02)
  return Math.max(0, d - eye * 1.2)
}

/**
 * Scatter `n` freckles by rejection sampling against `malarDensity`, so the
 * distribution is the density rather than a grid with jitter.
 *
 * `density` 0…1 scales how many actually land; `seed` fixes which.
 */
export function scatterFreckles(n: number, density: number, seed = 1): Freckle[] {
  const want = Math.max(0, Math.round(n * Math.min(1, Math.max(0, density))))
  const out: Freckle[] = []
  for (let i = 0; i < want * 40 && out.length < want; i++) {
    const x = hash(seed * 7.3 + i * 1.37) * 2 - 1
    const y = hash(seed * 3.1 + i * 2.71)
    if (hash(seed * 11.9 + i * 0.53) > malarDensity(x, y)) continue // rejected
    const t = hash(seed * 5.7 + i * 3.19)
    out.push({
      x,
      y,
      // halved: the range is the diameter a dermatologist quotes, and this is a radius
      r: (FRECKLE_MIN_MM + (FRECKLE_MAX_MM - FRECKLE_MIN_MM) * t * t) / 2 / FIELD_WIDTH_MM,
      strength: 0.45 + 0.55 * hash(seed * 2.2 + i * 1.11)
    })
  }
  return out
}

/**
 * The freckle colour for a skin tone: a warmer, darker version of the skin rather
 * than a fixed brown.
 *
 * A freckle is concentrated melanin in the same skin, so it reads as that skin
 * turned up — which is why a single brown looks painted on a fair face and
 * invisible on a deep one.
 */
export function freckleColour(skin: number, strength: number): number {
  const r = (skin >> 16) & 0xff
  const g = (skin >> 8) & 0xff
  const b = skin & 0xff
  const k = 1 - 0.26 * strength
  // warmer as it darkens: melanin absorbs blue hardest
  const nr = Math.round(r * (k + 0.06 * strength))
  const ng = Math.round(g * k)
  const nb = Math.round(b * (k - 0.06 * strength))
  const c = (v: number): number => Math.min(255, Math.max(0, v))
  return (c(nr) << 16) | (c(ng) << 8) | c(nb)
}
