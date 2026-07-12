import { describe, it, expect } from 'vitest'
import { perfAlpha } from '../src/renderer/fabric/perforate'
import { getFabric } from '../src/renderer/fabric/FabricLibrary'

describe('perforated / athletic-mesh cutout', () => {
  it('holes are holes, threads are threads', () => {
    // a hole centre: even row 0 centres sit at ((i+0.5)/holes, (j+0.5)/holes)
    expect(perfAlpha(0.5 / 14, 0.5 / 14)).toBe(0)
    // the thread junction between four holes is solid
    expect(perfAlpha(1 / 14, 1 / 14)).toBe(1)
  })

  it('tiles seamlessly (period 1 in u and v)', () => {
    for (const [u, v] of [
      [0.13, 0.37],
      [0.5, 0.5],
      [0.91, 0.08]
    ]) {
      expect(perfAlpha(u, v)).toBe(perfAlpha(u + 1, v))
      expect(perfAlpha(u, v)).toBe(perfAlpha(u, v + 1))
    }
  })

  it('odd rows offset half a cell (hex packing)', () => {
    const evenHole = perfAlpha(0.5 / 14, 0.5 / 14) // row 0 hole centre
    const oddAtSameU = perfAlpha(0.5 / 14, 1.5 / 14) // row 1, same u → offset puts a thread here…
    const oddHole = perfAlpha(1 / 14, 1.5 / 14) // …and the hole half a cell over
    expect(evenHole).toBe(0)
    expect(oddAtSameU).toBe(1)
    expect(oddHole).toBe(0)
  })

  it('open area is meshy — between 20% and 50%', () => {
    let open = 0
    const N = 96
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (perfAlpha((i + 0.5) / N, (j + 0.5) / N) === 0) open++
    const fraction = open / (N * N)
    expect(fraction).toBeGreaterThan(0.2)
    expect(fraction).toBeLessThan(0.5)
  })

  it('the athletic-mesh fabric is a perforated stretch knit', () => {
    const mesh = getFabric('athletic-mesh')
    expect(mesh.perforated).toBe(true)
    expect(mesh.family).toBe('knit')
    expect(mesh.stretch).toBeGreaterThan(0.5)
    expect(getFabric('denim').perforated).toBeUndefined() // regular cloth is solid
  })
})
