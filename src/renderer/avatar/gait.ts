/**
 * **Gait mechanics** — what actually separates a jog from a fast walk.
 *
 * Not the speed. A walk and a run are different machines, and the giveaway is
 * which way the body bobs:
 *
 * - **Walking is an inverted pendulum.** The body vaults *over* the stance leg, so
 *   its centre of mass is at its **highest at mid-stance** and drops at each
 *   double-support phase. One foot is always down.
 * - **Running is a spring.** The leg compresses under load and recoils, so the
 *   centre of mass is at its **lowest at mid-stance** and highest in mid-flight,
 *   with both feet off the ground.
 *
 * So the vertical trace is the same shape with the sign flipped, and playing a walk
 * clip faster gives a fast walk and never a jog. The bob is what makes it read as
 * running.
 */

export type Gait = 'walk' | 'run'

/**
 * Vertical excursion of the centre of mass over a step, in cm.
 *
 * Both are measured ranges from gait labs: a comfortable walk moves the body about
 * 4.5 cm and a jog about 8 cm, and the difference is visible from across a room.
 */
export const WALK_BOB_CM = 4.5
export const RUN_BOB_CM = 8

/** Cadence in steps per minute — a walk is around 110, a jog around 165. */
export const WALK_CADENCE = 110
export const RUN_CADENCE = 165

/**
 * How high the body sits at `phase` through a **step**, in metres above its lowest
 * point. Phase 0 is foot strike, 0.5 is mid-stance, 1 the next foot strike.
 *
 * One raised cosine, with the sign carrying the whole difference between the two
 * gaits: a walk peaks at mid-stance because the body is vaulting over a straight
 * leg, a run troughs there because the leg is compressed under it.
 */
export function comBob(phase: number, gait: Gait, scale = 1): number {
  const p = phase - Math.floor(phase)
  const amp = ((gait === 'run' ? RUN_BOB_CM : WALK_BOB_CM) / 100) * scale
  const s = gait === 'run' ? 1 : -1
  return (amp * (1 + s * Math.cos(2 * Math.PI * p))) / 2
}

/** How much faster a jog's clip has to run than a walk's, for the same clip. */
export function cadenceRatio(from: Gait, to: Gait): number {
  const c = (g: Gait): number => (g === 'run' ? RUN_CADENCE : WALK_CADENCE)
  return c(to) / c(from)
}

/**
 * Elbow flexion while running, in radians.
 *
 * A runner's arms are held bent at roughly a right angle and swing from the
 * shoulder; a walker's hang nearly straight. It is the second thing the eye reads
 * after the bob, and no amount of playing a walk clip faster produces it.
 */
export const RUN_ELBOW_RAD = Math.PI / 2
export const WALK_ELBOW_RAD = 0.12

export function elbowFlexion(gait: Gait): number {
  return gait === 'run' ? RUN_ELBOW_RAD : WALK_ELBOW_RAD
}

/**
 * Stride amplitude multiplier for the procedural body, where there is no clip to
 * play — a jog's legs swing further and its arms much further, because they are
 * bent and driving.
 */
export const RUN_LEG_GAIN = 1.35
export const RUN_ARM_GAIN = 1.5
