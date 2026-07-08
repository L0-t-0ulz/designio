import { describe, it, expect } from 'vitest'
import {
  timelineDuration,
  segmentStarts,
  angleDelta,
  lerpCameraPose,
  sampleTimeline,
  ease,
  newKeyframeId,
  type Keyframe,
  type CameraPose
} from '../src/renderer/studio/timeline'

const cam = (azimuth: number, distance = 3, target: [number, number, number] = [0, 1, 0]): CameraPose => ({ azimuth, polar: 1.2, distance, target })
const kf = (over: Partial<Keyframe>): Keyframe => ({ id: newKeyframeId(), camera: cam(0), subject: 'stand', duration: 2, ...over })

describe('animation timeline — shot sequencer sampling', () => {
  it('total duration sums every keyframe', () => {
    expect(timelineDuration([kf({ duration: 2 }), kf({ duration: 3 }), kf({ duration: 1 })])).toBe(6)
    expect(timelineDuration([])).toBe(0)
  })

  it('segment starts are cumulative', () => {
    expect(segmentStarts([kf({ duration: 2 }), kf({ duration: 3 }), kf({ duration: 1 })])).toEqual([0, 2, 5])
  })

  it('ease is a smoothstep (flat ends, monotonic, 0→0, 1→1)', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5, 6)
    expect(ease(0.25)).toBeLessThan(0.25) // eased in
  })

  it('angleDelta takes the shortest path across the ±π seam', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 6)
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6) // ~0.283, not -6
    expect(Math.abs(angleDelta(0.1, 0.1 + 2 * Math.PI))).toBeLessThan(1e-9)
  })

  it('lerpCameraPose rotates the short way and lerps distance/target', () => {
    const a = cam(0.2, 3, [0, 1, 0])
    const b = cam(0.2 + 2 * Math.PI - 0.4, 5, [1, 2, 3]) // ~ -0.2 the short way
    const mid = lerpCameraPose(a, b, 0.5)
    expect(mid.distance).toBeCloseTo(4, 6)
    expect(mid.target).toEqual([0.5, 1.5, 1.5])
    expect(Math.abs(angleDelta(0, mid.azimuth))).toBeLessThan(0.25) // stayed near 0, didn't swing the long way
  })

  it('samples null/single/first correctly', () => {
    expect(sampleTimeline([], 0)).toBeNull()
    const single = sampleTimeline([kf({ camera: cam(1) })], 99)
    expect(single?.index).toBe(0)
    expect(single?.camera.azimuth).toBe(1)
  })

  it('holds each keyframe subject through its segment and eases the camera', () => {
    const kfs = [
      kf({ camera: cam(0, 3), subject: 'stand', duration: 2 }),
      kf({ camera: cam(0, 5), subject: 'walk', duration: 2 }),
      kf({ camera: cam(0, 7), subject: 'relaxed', duration: 2 })
    ]
    expect(sampleTimeline(kfs, 0)?.subject).toBe('stand')
    expect(sampleTimeline(kfs, 0)?.camera.distance).toBeCloseTo(3, 6)
    // mid of segment 0 → eased between 3 and 5
    const mid = sampleTimeline(kfs, 1)!
    expect(mid.subject).toBe('stand')
    expect(mid.camera.distance).toBeGreaterThan(3)
    expect(mid.camera.distance).toBeLessThan(5)
    // segment 1 → walk
    expect(sampleTimeline(kfs, 3)?.subject).toBe('walk')
    // past the end → holds the last keyframe
    const end = sampleTimeline(kfs, 999)!
    expect(end.index).toBe(2)
    expect(end.camera.distance).toBeCloseTo(7, 6)
  })
})
