/**
 * **Mocap clip import** — parse a BVH motion-capture file into a clip: the joint
 * hierarchy (names · channels · offsets) + the per-frame motion samples + the frame
 * rate. Pure parsing (no DOM) so it's unit-tested; the studio imports it to preview
 * the take and (once retargeted to the avatar rig) drive the animation. (Retargeting
 * the raw joint angles onto the Mixamo skeleton is a follow-up — this reads the clip.)
 */
export interface BvhJoint {
  name: string
  offset: [number, number, number]
  channels: string[]
  children: BvhJoint[]
  /** True for an End Site (a leaf with no channels). */
  endSite: boolean
}

export interface BvhClip {
  root: BvhJoint
  frameTime: number
  /** One row of channel values per frame (flattened in hierarchy order). */
  frames: number[][]
}

/** Every joint in hierarchy order (depth-first), excluding End Sites. */
export function bvhJoints(clip: BvhClip): BvhJoint[] {
  const out: BvhJoint[] = []
  const walk = (j: BvhJoint): void => {
    if (!j.endSite) out.push(j)
    j.children.forEach(walk)
  }
  walk(clip.root)
  return out
}

export function bvhJointNames(clip: BvhClip): string[] {
  return bvhJoints(clip).map((j) => j.name)
}

/** Total channel count = the width of each motion frame row. */
export function bvhChannelCount(clip: BvhClip): number {
  return bvhJoints(clip).reduce((n, j) => n + j.channels.length, 0)
}

/** Clip duration in seconds. */
export function bvhDuration(clip: BvhClip): number {
  return Math.round(clip.frames.length * clip.frameTime * 1000) / 1000
}

/**
 * Parse a BVH file into a clip, or null if malformed. Reads the HIERARCHY block
 * (ROOT / JOINT / End Site with OFFSET + CHANNELS) then the MOTION block
 * (Frames + Frame Time + the sample rows).
 */
export function parseBVH(text: string): BvhClip | null {
  const tokens = text.replace(/\r/g, '').split(/\s+/).filter(Boolean)
  let i = 0
  const peek = (): string => tokens[i]
  const next = (): string => tokens[i++]
  const expect = (t: string): boolean => (tokens[i] === t ? (i++, true) : false)

  if (next() !== 'HIERARCHY') return null

  const parseJoint = (isRoot: boolean): BvhJoint | null => {
    const kw = next() // ROOT | JOINT | End
    let name: string
    let endSite = false
    if (kw === 'End') {
      next() // "Site"
      name = 'EndSite'
      endSite = true
    } else if ((isRoot && kw === 'ROOT') || (!isRoot && kw === 'JOINT')) {
      name = next()
    } else {
      return null
    }
    if (!expect('{')) return null
    const joint: BvhJoint = { name, offset: [0, 0, 0], channels: [], children: [], endSite }
    while (peek() !== '}') {
      const t = peek()
      if (t === 'OFFSET') {
        next()
        joint.offset = [parseFloat(next()), parseFloat(next()), parseFloat(next())]
      } else if (t === 'CHANNELS') {
        next()
        const n = parseInt(next(), 10)
        for (let c = 0; c < n; c++) joint.channels.push(next())
      } else if (t === 'JOINT' || t === 'End') {
        const child = parseJoint(false)
        if (!child) return null
        joint.children.push(child)
      } else {
        return null // unexpected token
      }
    }
    next() // consume '}'
    return joint
  }

  const root = parseJoint(true)
  if (!root) return null

  if (next() !== 'MOTION') return null
  if (next() !== 'Frames:') return null
  const frameCount = parseInt(next(), 10)
  if (next() !== 'Frame' || next() !== 'Time:') return null
  const frameTime = parseFloat(next())
  if (!Number.isFinite(frameTime)) return null

  const width = bvhChannelCount({ root, frameTime, frames: [] })
  const frames: number[][] = []
  for (let f = 0; f < frameCount; f++) {
    const row: number[] = []
    for (let c = 0; c < width; c++) {
      const v = parseFloat(next())
      if (!Number.isFinite(v)) return null
      row.push(v)
    }
    frames.push(row)
  }
  return { root, frameTime, frames }
}
