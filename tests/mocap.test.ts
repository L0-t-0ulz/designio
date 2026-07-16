import { describe, it, expect } from 'vitest'
import { parseBVH, bvhJointNames, bvhChannelCount, bvhDuration } from '../src/renderer/avatar/mocap'

// a minimal 2-joint BVH: a hip root (6 ch) + a spine joint (3 ch) with an End Site, 2 frames
const BVH = `HIERARCHY
ROOT Hips
{
  OFFSET 0.00 0.00 0.00
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Spine
  {
    OFFSET 0.00 10.00 0.00
    CHANNELS 3 Zrotation Xrotation Yrotation
    End Site
    {
      OFFSET 0.00 5.00 0.00
    }
  }
}
MOTION
Frames: 2
Frame Time: 0.0333333
0 90 0 0 0 0 0 0 0
0 91 0 1 0 0 2 0 0
`

describe('mocap clip import (BVH)', () => {
  it('parses the hierarchy — joints, channels, offsets', () => {
    const clip = parseBVH(BVH)!
    expect(clip).not.toBeNull()
    expect(bvhJointNames(clip)).toEqual(['Hips', 'Spine']) // End Site excluded
    expect(clip.root.channels).toHaveLength(6)
    expect(clip.root.children[0].name).toBe('Spine')
    expect(clip.root.children[0].offset).toEqual([0, 10, 0])
    // the End Site is a leaf with an offset + no channels
    const end = clip.root.children[0].children[0]
    expect(end.endSite).toBe(true)
    expect(end.channels).toHaveLength(0)
  })

  it('parses the motion — frames, frame time, correct row width', () => {
    const clip = parseBVH(BVH)!
    expect(bvhChannelCount(clip)).toBe(9) // 6 + 3
    expect(clip.frames).toHaveLength(2)
    expect(clip.frames[0]).toHaveLength(9)
    expect(clip.frames[1][3]).toBe(1) // a hip Z-rotation in frame 2
    expect(clip.frameTime).toBeCloseTo(0.0333333, 6)
    expect(bvhDuration(clip)).toBeCloseTo(0.067, 2) // 2 × frame time
  })

  it('returns null on a malformed file', () => {
    expect(parseBVH('not a bvh')).toBeNull()
    expect(parseBVH('HIERARCHY\nROOT Hips\n{ OFFSET 0 0 0 }')).toBeNull() // no MOTION
  })
})
