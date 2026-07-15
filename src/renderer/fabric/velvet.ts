import type { Fabric } from './FabricLibrary'

/**
 * **Velvet retroreflective lobe** — the hallmark of velvet/velour is a view-dependent
 * response opposite to most cloth: it goes **dark facing** the camera (light sinks into
 * the upright pile) and **bright at grazing angles** (the pile's sides catch the light —
 * the glowing silhouette rim). Three's built-in sheen already lifts the grazing rim; this
 * adds the missing *dark-facing* term. `velvetFacingFactor` is the pure diffuse
 * multiplier (mirrored in the fabric shader) so it's unit-tested; only true napped-velvet
 * fabrics use it (a uniform gates it to zero — an identity — for everything else).
 */

/** How dark velvet goes when viewed straight on (the facing floor, 0…1). */
export const VELVET_FLOOR = 0.42

/**
 * Diffuse multiplier for velvet at a given `|N·V|` — `1` at grazing (`ndotV → 0`, the
 * bright rim) falling to `floor` facing the camera (`ndotV → 1`, the dark pile), by the
 * square so the rim stays crisp. Pure; the shader uses the identical expression.
 */
export function velvetFacingFactor(ndotV: number, floor = VELVET_FLOOR): number {
  const v = Math.max(0, Math.min(1, ndotV))
  return 1 - (1 - floor) * v * v
}

/** Whether a fabric renders as true velvet/velour — a lustrous nap (not matte suede/fleece). */
export function isVelvet(fabric: Fabric): boolean {
  return fabric.nap === true && fabric.sheen >= 0.8
}
