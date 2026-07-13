import { describe, it, expect } from 'vitest'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric: FabricParams = {
  mass: 0.3,
  stretchCompliance: 1e-6,
  bendCompliance: 1e-3,
  damping: 0.02,
  friction: 0.5,
  aero: 0,
  color: 0x808080
}

/** RMS z-jitter (wrinkliness) over a set of particles. */
const roughness = (pos: Float32Array, ks: number[]): number => {
  let s = 0
  for (const k of ks) s += pos[k * 3 + 2] ** 2
  return Math.sqrt(s / ks.length)
}

describe('steam & press (the virtual iron)', () => {
  const make = (): { s: XPBDSolver; pos: Float32Array; nx: number; ny: number } => {
    const nx = 12
    const ny = 12
    const pos = new Float32Array(nx * ny * 3)
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const k = (iy * nx + ix) * 3
      pos[k] = ix * 0.02
      pos[k + 1] = 1 - iy * 0.02
      pos[k + 2] = ((ix * 7 + iy * 13) % 5) * 0.004 - 0.008 // deterministic wrinkles
    }
    const s = new XPBDSolver(nx, ny, pos, fabric, { wrapX: false, pinned: [0] })
    s.colliders = []
    return { s, pos, nx, ny }
  }

  it('flattens wrinkles inside the iron radius, leaves the rest alone', () => {
    const { s, pos, nx } = make()
    const centre = { x: 5 * 0.02, y: 1 - 5 * 0.02 } // around particle (5,5)
    const inside: number[] = []
    const outside: number[] = []
    for (let k = 0; k < 144; k++) {
      const dx = pos[k * 3] - centre.x
      const dy = pos[k * 3 + 1] - centre.y
      if (Math.hypot(dx, dy) < 0.035) inside.push(k)
      else if (Math.hypot(dx, dy) > 0.08) outside.push(k)
    }
    const roughIn0 = roughness(pos, inside)
    const roughOut0 = roughness(pos, outside)
    for (let i = 0; i < 6; i++) s.pressAt(centre.x, centre.y, 0, 0.04) // a few passes of the iron
    expect(roughness(pos, inside)).toBeLessThan(roughIn0 * 0.6) // pressed flat(ter)
    expect(roughness(pos, outside)).toBeCloseTo(roughOut0, 10) // untouched far away
    expect(nx).toBe(12)
  })

  it('a miss presses nothing; pinned particles never move', () => {
    const { s, pos } = make()
    const before = pos.slice()
    s.pressAt(5, 5, 5, 0.04) // far away from the cloth
    expect(pos).toEqual(before)
    const pinned0 = [pos[0], pos[1], pos[2]]
    for (let i = 0; i < 6; i++) s.pressAt(pos[0], pos[1], pos[2], 0.05) // iron right on the pin
    expect([pos[0], pos[1], pos[2]]).toEqual(pinned0)
  })
})
