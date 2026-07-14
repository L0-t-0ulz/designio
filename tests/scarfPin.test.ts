import { describe, it, expect } from 'vitest'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
import { getGarment } from '../src/renderer/garments/registry'

// A small flat vertical sheet (like a scarf strip section), top row pinned.
const NX = 12
const NY = 8
function sheet(): { positions: Float32Array; pinned: number[] } {
  const positions = new Float32Array(NX * NY * 3)
  for (let iy = 0; iy < NY; iy++) {
    for (let ix = 0; ix < NX; ix++) {
      const i = (iy * NX + ix) * 3
      positions[i] = ix * 0.02
      positions[i + 1] = 1.5 - iy * 0.02
      positions[i + 2] = (ix % 2) * 0.001 // z-perturb so the sheet folds, not splays
    }
  }
  return { positions, pinned: Array.from({ length: NX }, (_, ix) => ix) }
}

describe('the scarf pin / brooch — pinTogether', () => {
  it('sews two distant particles to the stitch length', () => {
    const { positions, pinned } = sheet()
    const solver = new XPBDSolver(NX, NY, positions, FABRICS.cotton, { pinned, wrapX: false })
    // bottom corners — far apart before the pin
    const ia = (NY - 1) * NX
    const ib = (NY - 1) * NX + (NX - 1)
    const dist = (): number => {
      const a = ia * 3
      const b = ib * 3
      return Math.hypot(positions[a] - positions[b], positions[a + 1] - positions[b + 1], positions[a + 2] - positions[b + 2])
    }
    const before = dist()
    expect(before).toBeGreaterThan(0.15)
    const count = solver.pinTogether(ia, ib)
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < 300; i++) solver.step(1 / 60)
    expect(dist()).toBeLessThan(0.05) // drawn together like a pinned brooch
    for (let i = 0; i < NX * NY * 3; i++) expect(Number.isFinite(positions[i])).toBe(true)
  })

  it('scarves offer the pin; a dress does not', () => {
    expect(getGarment('scarf').supports.scarfPin).toBe(true)
    expect(getGarment('skinny-scarf').supports.scarfPin).toBe(true)
    expect(getGarment('dress').supports.scarfPin).toBeUndefined()
  })
})
