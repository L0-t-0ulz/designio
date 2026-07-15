import { describe, it, expect } from 'vitest'
import { hardwarePlacements, hardwareBOM, type HardwareInput } from '../src/renderer/garments/hardware'
import type { PocketPlacement } from '../src/renderer/garments/decor'

const HIP: PocketPlacement[] = [
  { x: -0.1, y: 0.0, z: 0.16, w: 0.12, h: 0.13 },
  { x: 0.1, y: 0.0, z: 0.16, w: 0.12, h: 0.13 }
]

const base: HardwareInput = {
  pockets: HIP,
  rivet: false,
  eyelet: false,
  snap: false,
  frontZ: 0.18,
  waistY: 0.1,
  neckY: 0.55,
  hemY: -0.1
}

describe('hardware placement', () => {
  it('places two rivets at the top corners of each hip pocket', () => {
    const ps = hardwarePlacements({ ...base, rivet: true })
    const rivets = ps.filter((p) => p.kind === 'rivet')
    expect(rivets).toHaveLength(4) // 2 pockets × 2 top corners
    // each rivet sits at a pocket's top edge, at its left/right corner x
    const yTop = HIP[0].y + HIP[0].h / 2
    expect(rivets.every((r) => Math.abs(r.y - yTop) < 1e-9)).toBe(true)
    expect(rivets.some((r) => Math.abs(r.x - (HIP[0].x - HIP[0].w / 2)) < 1e-9)).toBe(true)
  })

  it('no rivets when the fabric is too light to reinforce', () => {
    expect(hardwarePlacements({ ...base, rivet: false }).filter((p) => p.kind === 'rivet')).toHaveLength(0)
  })

  it('flanks centre-front with two drawstring eyelets', () => {
    const eyes = hardwarePlacements({ ...base, eyelet: true }).filter((p) => p.kind === 'eyelet')
    expect(eyes).toHaveLength(2)
    expect(eyes[0].x).toBeLessThan(0) // one either side of centre
    expect(eyes[1].x).toBeGreaterThan(0)
    expect(eyes.every((e) => Math.abs(e.y - base.waistY) < 1e-9)).toBe(true)
  })

  it('runs a snap column down the placket, inside neck→hem and on centre-front', () => {
    const snaps = hardwarePlacements({ ...base, snap: true }).filter((p) => p.kind === 'snap')
    expect(snaps.length).toBeGreaterThanOrEqual(4)
    expect(snaps.every((s) => Math.abs(s.x) < 1e-9)).toBe(true) // centre-front
    for (const s of snaps) {
      expect(s.y).toBeLessThanOrEqual(base.neckY)
      expect(s.y).toBeGreaterThanOrEqual(base.hemY)
      expect(s.z).toBe(base.frontZ)
    }
    // ordered top→bottom
    expect(snaps[0].y).toBeGreaterThan(snaps[snaps.length - 1].y)
  })

  it('rolls placements into one BOM line per kind, only for present hardware', () => {
    const ps = hardwarePlacements({ ...base, rivet: true, eyelet: true })
    const bom = hardwareBOM(ps)
    expect(bom.map((b) => b.kind)).toEqual(['rivet', 'eyelet']) // snaps absent
    expect(bom.find((b) => b.kind === 'rivet')!.count).toBe(4)
    expect(bom.find((b) => b.kind === 'rivet')!.label).toBe('4 × rivet (pocket corners)')
    expect(hardwareBOM([])).toEqual([])
  })
})
