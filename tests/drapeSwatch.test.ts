import { describe, it, expect } from 'vitest'
import { fillSwatch, rodPins } from '../src/renderer/studio/drapeSwatch'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { fabricToSolverParams, getFabric } from '../src/renderer/fabric/FabricLibrary'

describe('drape swatch comparator', () => {
  it('fills a flat vertical sheet of the right span, centred where asked', () => {
    const nx = 5
    const ny = 4
    const pos = new Float32Array(nx * ny * 3)
    fillSwatch(pos, nx, ny, 0.24, 0.3, 0.34, 0.17)
    expect(pos[0]).toBeCloseTo(0.17 - 0.12, 6) // left edge
    expect(pos[(nx - 1) * 3]).toBeCloseTo(0.17 + 0.12, 6) // right edge
    expect(pos[1]).toBeCloseTo(0.34, 6) // top row at topY
    expect(pos[((ny - 1) * nx) * 3 + 1]).toBeCloseTo(0.04, 6) // bottom row = topY − h
    for (let k = 0; k < nx * ny; k++) expect(pos[k * 3 + 2]).toBe(0) // flat
  })

  it('rod pins only the middle third of the top row', () => {
    const pins = rodPins(22)
    expect(Math.min(...pins)).toBe(7)
    expect(Math.max(...pins)).toBe(14)
    expect(pins.length).toBeLessThan(22 / 2) // the shoulders hang free
  })

  it('the comparator shows real differences: fabrics settle into distinct shapes, deterministically', () => {
    const settle = (fabricId: string): Float32Array => {
      const nx = 16
      const ny = 18
      const pos = new Float32Array(nx * ny * 3)
      fillSwatch(pos, nx, ny, 0.24, 0.3, 0.34)
      const s = new XPBDSolver(nx, ny, pos, fabricToSolverParams(getFabric(fabricId)), { wrapX: false, pinned: rodPins(nx) })
      s.colliders = []
      for (let i = 0; i < 200; i++) s.step(1 / 60)
      return pos.slice()
    }
    const dist = (a: Float32Array, b: Float32Array): number => {
      let d = 0
      for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2
      return Math.sqrt(d / (a.length / 3))
    }
    const denim = settle('denim')
    const chiffon = settle('chiffon')
    expect(dist(denim, chiffon)).toBeGreaterThan(0.01) // visibly different drapes (> 1 cm RMS)
    expect(dist(denim, settle('denim'))).toBe(0) // deterministic — the same cloth hangs identically
  })
})
