import { describe, it, expect } from 'vitest'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric = (over: Partial<FabricParams>): FabricParams => ({
  mass: 0.3,
  stretchCompliance: 1e-6,
  bendCompliance: 1e-3,
  aero: 0.2,
  damping: 0.02,
  friction: 0.5,
  color: 0x808080,
  ...over
})

// A small tube: nx columns (wrap), ny rows, laid out in a ring.
function tube(nx: number, ny: number): XPBDSolver {
  const pos = new Float32Array(nx * ny * 3)
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = (ix / nx) * Math.PI * 2
      const k = (iy * nx + ix) * 3
      pos[k] = Math.cos(a)
      pos[k + 1] = iy * 0.1
      pos[k + 2] = Math.sin(a)
    }
  }
  return new XPBDSolver(nx, ny, pos, fabric({}), { wrapX: true })
}

describe('per-panel physics — front vs back drape stiffness', () => {
  it('splits constraints into front + back panels (both non-empty on a tube)', () => {
    const s = tube(8, 6)
    const c = s.panelCompliance()
    expect(c.frontCount).toBeGreaterThan(0)
    expect(c.backCount).toBeGreaterThan(0)
  })

  it('setPanelFabric gives the back its own compliance, the front its own', () => {
    const s = tube(8, 6)
    const stiff = fabric({ stretchCompliance: 1e-8 }) // very stiff
    const soft = fabric({ stretchCompliance: 1e-4 }) // very soft
    s.setPanelFabric(soft, stiff) // soft front, stiff back
    const c = s.panelCompliance()
    expect(c.front).toBeCloseTo(1e-4, 10)
    expect(c.back).toBeCloseTo(1e-8, 12)
    expect(c.front).toBeGreaterThan(c.back) // front softer (higher compliance) than back
  })

  it('setPanelFabric applies per-panel mass (heavier back = lower invMass)', () => {
    const nx = 8
    const s = tube(nx, 6)
    s.setPanelFabric(fabric({ mass: 0.2 }), fabric({ mass: 0.8 })) // light front, heavy back
    const half = Math.floor(nx / 2)
    const frontK = 0 // column 0 → front
    const backK = half + 1 // a back column
    expect(s.invMass[frontK]).toBeGreaterThan(s.invMass[backK]) // lighter front → larger invMass
  })

  it('equal front/back params behave like a uniform fabric', () => {
    const s = tube(8, 6)
    const f = fabric({ stretchCompliance: 5e-6 })
    s.setPanelFabric(f, f)
    const c = s.panelCompliance()
    expect(c.front).toBeCloseTo(c.back, 12)
    expect(c.front).toBeCloseTo(5e-6, 10)
  })

  it('a flat (non-wrap) panel has no back region — all constraints are front', () => {
    const pos = new Float32Array(5 * 5 * 3)
    for (let i = 0; i < 25; i++) {
      pos[i * 3] = (i % 5) * 0.1
      pos[i * 3 + 1] = Math.floor(i / 5) * 0.1
    }
    const s = new XPBDSolver(5, 5, pos, fabric({}), { wrapX: false })
    expect(s.panelCompliance().backCount).toBe(0)
  })
})
