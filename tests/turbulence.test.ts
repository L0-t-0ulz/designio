import { describe, it, expect } from 'vitest'
import { turbulentWind } from '../src/renderer/cloth/turbulence'
import { WIND_PRESETS, getWindPreset } from '../src/renderer/cloth/windPresets'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric: FabricParams = {
  mass: 0.2,
  stretchCompliance: 1e-5,
  bendCompliance: 1e-3,
  damping: 0.02,
  friction: 0.4,
  aero: 0.3,
  color: 0x808080
}

const sample = (x: number, y: number, z: number, t: number): { x: number; y: number; z: number } => {
  const o = { x: 0, y: 0, z: 0 }
  turbulentWind(x, y, z, t, o)
  return o
}

describe('turbulent wind field', () => {
  it('bounded, deterministic, and sideways-biased (air swirls more than it lifts)', () => {
    for (let i = 0; i < 200; i++) {
      const o = sample(i * 0.37, i * 0.11, i * 0.23, i * 0.05)
      expect(Math.abs(o.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(o.y)).toBeLessThanOrEqual(0.6)
      expect(Math.abs(o.z)).toBeLessThanOrEqual(1)
    }
    expect(sample(1, 2, 3, 4)).toEqual(sample(1, 2, 3, 4)) // no RNG
  })

  it('varies across space and time — the whole point of a field', () => {
    const a = sample(0, 1, 0, 0)
    const b = sample(0.5, 1, 0, 0) // half a metre away
    const c = sample(0, 1, 0, 0.5) // half a second later
    expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(0.05)
    expect(Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z)).toBeGreaterThan(0.05)
  })

  it('the storm preset is turbulent; the classic presets stay uniform (byte-identical wind)', () => {
    const storm = getWindPreset('storm')!
    expect(storm.turbulence).toBe(1)
    for (const name of ['still', 'breeze', 'gust', 'runway']) {
      expect(getWindPreset(name)!.turbulence).toBeUndefined()
    }
    expect(WIND_PRESETS.length).toBe(5)
  })

  it('solver: turbulence kicks nearby free particles differently; zero wind = zero effect', () => {
    const make = (windX: number, turb: number): Float32Array => {
      const nx = 6
      const ny = 6
      const pos = new Float32Array(nx * ny * 3)
      for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
        const k = (iy * nx + ix) * 3
        pos[k] = ix * 0.1
        pos[k + 1] = 1.5 - iy * 0.1
      }
      const s = new XPBDSolver(nx, ny, pos, fabric, { wrapX: false, pinned: [0, 1, 2, 3, 4, 5] })
      s.colliders = []
      s.wind.set(windX, 0, 0)
      s.turbulence = turb
      s.gravity.set(0, 0, 0) // isolate the wind response
      for (let i = 0; i < 10; i++) s.step(1 / 60)
      return pos
    }
    const uniform = make(3, 0)
    const turbulent = make(3, 1)
    // under uniform wind every free row-particle displaces identically in z; turbulence breaks that
    const zSpread = (pos: Float32Array): number => {
      const zs = [30, 31, 32, 33, 34, 35].map((k) => pos[k * 3 + 2]) // the free bottom row
      return Math.max(...zs) - Math.min(...zs)
    }
    expect(zSpread(turbulent)).toBeGreaterThan(zSpread(uniform))
    // no base wind → turbulence has no lever arm (still stays perfectly still)
    const still = make(0, 1)
    for (let k = 30; k < 36; k++) expect(Math.abs(still[k * 3 + 2])).toBeLessThan(1e-9)
  })
})
