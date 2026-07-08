import { describe, it, expect } from 'vitest'
import { strainToColor } from '../src/renderer/fabric/heatmap'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric: FabricParams = {
  mass: 0.3,
  stretchCompliance: 1e-6,
  bendCompliance: 1e-3,
  damping: 0.02,
  friction: 0.5,
  aero: 0.2,
  color: 0x808080
}

describe('fit / tension heatmap', () => {
  it('slack → blue, neutral → green, tight → red', () => {
    const [sr, , sb] = strainToColor(-0.2) // very slack
    expect(sb).toBeGreaterThan(sr) // blue dominates
    const [nr, ng, nb] = strainToColor(0) // neutral
    expect(ng).toBeGreaterThan(nr)
    expect(ng).toBeGreaterThan(nb) // green dominates
    const [tr, tg, tb] = strainToColor(0.2) // very tight
    expect(tr).toBeGreaterThan(tg)
    expect(tr).toBeGreaterThan(tb) // red dominates
  })

  it('is monotonic in strain along the red channel and clamps at the ends', () => {
    expect(strainToColor(-5)).toEqual(strainToColor(-0.12)) // clamped slack
    expect(strainToColor(5)).toEqual(strainToColor(0.12)) // clamped tight
    expect(strainToColor(0.05)[0]).toBeGreaterThan(strainToColor(-0.05)[0]) // tighter = redder
  })

  it('solver strain: ~0 at rest, positive where the cloth is stretched', () => {
    // a flat 5×5 grid; rest lengths are measured from these positions
    const nx = 5
    const ny = 5
    const pos = new Float32Array(nx * ny * 3)
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const k = (iy * nx + ix) * 3
      pos[k] = ix * 0.1
      pos[k + 1] = iy * 0.1
    }
    const s = new XPBDSolver(nx, ny, pos, fabric, { wrapX: false })
    const strain = new Float32Array(nx * ny)
    s.strain(strain)
    for (const v of strain) expect(Math.abs(v)).toBeLessThan(1e-6) // at rest

    // pull the centre particle far out of plane → its constraints stretch
    const c = 12 // (2,2)
    pos[c * 3 + 2] = 0.5
    s.strain(strain)
    expect(strain[c]).toBeGreaterThan(0.1) // stretched = tight (positive)
    expect(strain[0]).toBeCloseTo(0, 4) // a far corner unaffected
  })
})
