import { describe, it, expect } from 'vitest'
import { PIPING_DIAMETER, Piping, makePipingMaterial } from '../src/renderer/garment/Piping'
import { getGarment } from '../src/renderer/garments/registry'

describe('piping / corded edges', () => {
  it('a real cord: ~4 mm world-unit thickness on the shared material', () => {
    const mat = makePipingMaterial()
    expect(PIPING_DIAMETER).toBeCloseTo(0.004, 10)
    expect(mat.linewidth).toBe(PIPING_DIAMETER)
    expect(mat.worldUnits).toBe(true)
  })

  it('traces both boundary rows as closed loops that track the live positions', () => {
    const nx = 6
    const ny = 4
    const positions = new Float32Array(nx * ny * 3)
    const normals = new Float32Array(nx * ny * 3)
    for (let k = 0; k < nx * ny; k++) {
      positions[k * 3] = k // distinguishable coordinates
      positions[k * 3 + 1] = k * 2
      normals[k * 3 + 1] = 1 // +y normals → lift moves points up
    }
    const piping = new Piping(nx, ny, makePipingMaterial())
    piping.update(positions, normals, 0.01)
    expect(piping.object.children.length).toBe(2) // neckline + hem cords
    // the loop closes: last point duplicates the first (private arr — reach via any for the assertion)
    const loops = (piping as unknown as { loops: { arr: Float32Array; idx: number[] }[] }).loops
    for (const { arr, idx } of loops) {
      expect(arr.length).toBe((nx + 1) * 3)
      expect(arr[nx * 3]).toBe(arr[0])
      expect(arr[nx * 3 + 2]).toBe(arr[2])
      // the first point is the row particle lifted along its normal
      expect(arr[0]).toBe(positions[idx[0] * 3])
      expect(arr[1]).toBeCloseTo(positions[idx[0] * 3 + 1] + 0.01, 6) // float32 storage precision
    }
    // hem row is the last ring
    expect(loops[1].idx[0]).toBe((ny - 1) * nx)
    piping.dispose()
  })

  it('every top/dress/bottom offers the Piping detail', () => {
    for (const id of ['top', 'dress', 'skirt', 'pants', 'gown', 'hoodie'] as const) {
      expect(getGarment(id).supports.piping).toBe(true)
    }
  })
})
