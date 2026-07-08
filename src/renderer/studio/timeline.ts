import type { PoseName } from '../avatar/poses'

/**
 * A **shot sequencer** timeline — an ordered list of keyframes, each a saved camera
 * angle + what the avatar is doing (a static pose or a live idle/walk) + how long to
 * ease to the next. Playback eases the camera between keyframes and holds each
 * keyframe's subject for its segment. The sampling math is pure (unit-tested); the
 * player (Viewport camera + mannequin poses) and WebM recording are wired in main.
 */

/** An orbit camera angle around a target (spherical), serialisable. */
export interface CameraPose {
  azimuth: number
  polar: number
  distance: number
  target: [number, number, number]
}

/** What the avatar does during a segment — a static pose or a live clip. */
export type TimelineSubject = PoseName | 'idle' | 'walk'

export interface Keyframe {
  id: string
  camera: CameraPose
  subject: TimelineSubject
  /** Seconds to ease from this keyframe to the next (the last keyframe holds). */
  duration: number
}

let seq = 0
export const newKeyframeId = (): string => `kf${++seq}_${Math.random().toString(36).slice(2, 6)}`

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
/** Smoothstep ease for camera moves (0→0, 1→1, flat ends). */
export const ease = (t: number): number => {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/** Total timeline length (s) — the sum of every keyframe's duration (the last is a hold). */
export function timelineDuration(kfs: Keyframe[]): number {
  return kfs.reduce((s, k) => s + Math.max(0, k.duration), 0)
}

/** Cumulative start time (s) of each keyframe's segment. */
export function segmentStarts(kfs: Keyframe[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const k of kfs) {
    out.push(acc)
    acc += Math.max(0, k.duration)
  }
  return out
}

const TWO_PI = Math.PI * 2
/** Shortest signed angular delta a→b, in (−π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % TWO_PI
  if (d > Math.PI) d -= TWO_PI
  if (d <= -Math.PI) d += TWO_PI
  return d
}

/** Interpolate two camera poses (azimuth takes the shortest path). */
export function lerpCameraPose(a: CameraPose, b: CameraPose, u: number): CameraPose {
  const k = clamp01(u)
  return {
    azimuth: a.azimuth + angleDelta(a.azimuth, b.azimuth) * k,
    polar: a.polar + (b.polar - a.polar) * k,
    distance: a.distance + (b.distance - a.distance) * k,
    target: [
      a.target[0] + (b.target[0] - a.target[0]) * k,
      a.target[1] + (b.target[1] - a.target[1]) * k,
      a.target[2] + (b.target[2] - a.target[2]) * k
    ]
  }
}

export interface TimelineSample {
  camera: CameraPose
  subject: TimelineSubject
  /** Which keyframe/segment is active. */
  index: number
}

/**
 * Sample the timeline at time `t` (s): the eased camera between the active keyframe
 * and the next, and that keyframe's subject. Returns `null` for an empty timeline;
 * a single keyframe returns itself; past the end holds the last keyframe.
 */
export function sampleTimeline(kfs: Keyframe[], t: number): TimelineSample | null {
  if (kfs.length === 0) return null
  if (kfs.length === 1) return { camera: kfs[0].camera, subject: kfs[0].subject, index: 0 }
  const n = kfs.length
  const starts = segmentStarts(kfs)
  const total = timelineDuration(kfs)
  const tt = Math.max(0, Math.min(total, t))
  // once we reach the last keyframe's start, hold it
  if (tt >= starts[n - 1]) return { camera: kfs[n - 1].camera, subject: kfs[n - 1].subject, index: n - 1 }
  // find the segment i where starts[i] <= tt < starts[i+1]
  let i = 0
  for (let s = 0; s < n - 1; s++) {
    if (tt >= starts[s] && tt < starts[s + 1]) {
      i = s
      break
    }
  }
  const dur = Math.max(1e-6, kfs[i].duration)
  const localT = (tt - starts[i]) / dur
  return { camera: lerpCameraPose(kfs[i].camera, kfs[i + 1].camera, ease(localT)), subject: kfs[i].subject, index: i }
}
