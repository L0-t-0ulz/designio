/**
 * **Reflective piping / trim** — the retroreflective binding on winter headwear &
 * outerwear (hi-vis tape, 3M-style piping) that catches the light back toward the
 * viewer and reads bright against a dark shell. Modelled as a bright *silvered*
 * trim: the trim's colour is lifted toward white for a self-lit glow, over a low
 * roughness that catches the studio environment. The recipe is pure numbers (no
 * THREE) so it's unit-tested; the renderer applies it to the trim material and
 * builds the emissive colour from `emissiveLift`.
 */
export interface ReflectiveTrimLook {
  /** Blend the trim's own colour toward white for the glow, 0 (no lift) … 1 (white). */
  emissiveLift: number
  /** Self-lit intensity so the piping reads bright even out of the key light. */
  emissiveIntensity: number
  roughness: number
  metalness: number
  envMapIntensity: number
}

/**
 * The reflective-piping look — a bright silvered strip. Pure + unit-tested; a fixed
 * recipe (a first-pass like the other finish recipes), tuned so the trim reads as
 * hi-vis retroreflective tape rather than a plain contrast band.
 */
export function reflectiveTrimLook(): ReflectiveTrimLook {
  return {
    emissiveLift: 0.7, // mostly silver-white, keeping a hint of the trim colour
    emissiveIntensity: 0.5,
    roughness: 0.32, // low — catches the room like reflective tape
    metalness: 0.1,
    envMapIntensity: 1.6
  }
}
