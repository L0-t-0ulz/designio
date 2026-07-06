/**
 * Fabric presets for the XPBD solver.
 *
 * `stretchCompliance` / `bendCompliance` are XPBD compliances (inverse
 * stiffness, in m/N). Smaller = stiffer. Stretch resists in-plane deformation;
 * bend controls how easily the sheet folds/drapes. `mass` is the whole panel in
 * kg; `friction` in [0,1] governs how much the cloth grips the body.
 *
 * Values are hand-tuned for a ~1 m panel and are meant to be adjusted by feel.
 */
export interface FabricParams {
  stretchCompliance: number
  bendCompliance: number
  mass: number
  damping: number
  friction: number
  /** Aerodynamic drag: air resistance on the sheet moving broadside — high for light,
   *  sheer, fluid fabrics (they billow / float / lag), ~0 for heavy, crisp ones (near-rigid). */
  aero: number
  color: number
}

export const FABRICS = {
  denim: {
    stretchCompliance: 0.0,
    bendCompliance: 0.00015,
    mass: 0.55,
    damping: 1.4,
    friction: 0.5,
    aero: 1,
    color: 0x3b5b82
  },
  cotton: {
    stretchCompliance: 0.00008,
    bendCompliance: 0.0025,
    mass: 0.32,
    damping: 1.1,
    friction: 0.55,
    aero: 3.5,
    color: 0xc85a54
  },
  silk: {
    stretchCompliance: 0.0004,
    bendCompliance: 0.009,
    mass: 0.16,
    damping: 0.7,
    friction: 0.3,
    aero: 8,
    color: 0xd9c27e
  },
  knit: {
    stretchCompliance: 0.004,
    bendCompliance: 0.014,
    mass: 0.24,
    damping: 0.9,
    friction: 0.5,
    aero: 4.5,
    color: 0x5f8f6b
  }
} satisfies Record<string, FabricParams>

export type FabricName = keyof typeof FABRICS
