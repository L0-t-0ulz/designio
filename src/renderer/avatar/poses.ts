/**
 * A small **pose library** for lookbook stills. Each pose is guaranteed to look
 * natural: on the GLB avatar it **freezes a real idle/walk clip frame** at a chosen
 * phase; on the procedural body it applies a matching static stance (per-limb X
 * swing, the same channel the walk/idle use). Garments re-settle on the new pose.
 */
export type PoseName = 'stand' | 'weight-shift' | 'stride' | 'relaxed'

export interface Pose {
  name: PoseName
  label: string
  /** GLB: which clip to freeze + at what phase (0…1 of its duration). */
  glb: { clip: 'idle' | 'walk'; phase: number }
  /** Procedural body: static per-limb forward/back swing (radians). */
  proc: { legL: number; legR: number; armL: number; armR: number }
}

export const POSES: Pose[] = [
  { name: 'stand', label: 'Stand', glb: { clip: 'idle', phase: 0 }, proc: { legL: 0, legR: 0, armL: 0, armR: 0 } },
  { name: 'weight-shift', label: 'Weight shift', glb: { clip: 'idle', phase: 0.55 }, proc: { legL: 0.07, legR: -0.03, armL: 0.04, armR: -0.06 } },
  { name: 'stride', label: 'Stride', glb: { clip: 'walk', phase: 0.2 }, proc: { legL: 0.42, legR: -0.42, armL: -0.3, armR: 0.3 } },
  { name: 'relaxed', label: 'Relaxed', glb: { clip: 'idle', phase: 0.3 }, proc: { legL: 0.05, legR: -0.03, armL: 0.06, armR: -0.05 } }
]

export const POSE_NAMES: PoseName[] = POSES.map((p) => p.name)

/** The pose by name (falls back to a neutral stand). */
export function getPose(name: PoseName): Pose {
  return POSES.find((p) => p.name === name) ?? POSES[0]
}
