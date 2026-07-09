/**
 * Colour-shifting eveningwear finishes — thin-film **iridescence** (soap-bubble /
 * hologram / oil-slick), beyond the sequin/foil sparkle. Each maps to a
 * `MeshPhysicalMaterial` recipe (iridescence + a metallic/gloss base); the recipe
 * is pure so it's unit-tested and the stack just applies it in `applyLook`.
 */
export type IridescentKind = 'iridescent' | 'holographic' | 'oil-slick'
export const IRIDESCENT_KINDS: IridescentKind[] = ['iridescent', 'holographic', 'oil-slick']

export interface IridescentParams {
  iridescence: number
  iridescenceIOR: number
  /** Thin-film thickness range (nm) — wider = more colour bands across the surface. */
  thicknessRange: [number, number]
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  envMapIntensity: number
}

export function iridescentParams(kind: IridescentKind): IridescentParams {
  switch (kind) {
    case 'holographic':
      // bright, strong colour shift over a semi-metallic base (hologram foil)
      return { iridescence: 1, iridescenceIOR: 1.5, thicknessRange: [200, 900], metalness: 0.6, roughness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.5 }
    case 'oil-slick':
      // dark, saturated oil-on-water swirl (metallic-ombré feel)
      return { iridescence: 1, iridescenceIOR: 1.8, thicknessRange: [300, 1200], metalness: 0.9, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.3 }
    default:
      // subtle soap-bubble sheen sitting on the fabric
      return { iridescence: 0.7, iridescenceIOR: 1.3, thicknessRange: [100, 500], metalness: 0.2, roughness: 0.3, clearcoat: 0.2, clearcoatRoughness: 0.25, envMapIntensity: 1.2 }
  }
}
