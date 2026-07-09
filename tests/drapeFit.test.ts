import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { buildTubeGarment } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
import { ringGirthCm, drapedGirths } from '../src/renderer/export/drapeFit'

const TAU = Math.PI * 2
const mann = buildMannequin()

/** A regular tube: `ny` rings top→bottom, each an `nx`-gon of radius R. */
function tube(nx: number, ny: number, R: number, topY: number, botY: number): Float32Array {
  const pos = new Float32Array(nx * ny * 3)
  for (let iy = 0; iy < ny; iy++) {
    const y = topY + (botY - topY) * (ny > 1 ? iy / (ny - 1) : 0)
    for (let ix = 0; ix < nx; ix++) {
      const a = (ix / nx) * TAU
      const k = (iy * nx + ix) * 3
      pos[k] = Math.cos(a) * R
      pos[k + 1] = y
      pos[k + 2] = Math.sin(a) * R
    }
  }
  return pos
}

describe('draped fit — ring girth from the live mesh', () => {
  it('measures a ring polygon perimeter at a covered height', () => {
    const nx = 48
    const R = 0.15
    const pos = tube(nx, 6, R, 1.5, 0.8)
    const expected = nx * 2 * R * Math.sin(Math.PI / nx) * 100 // regular-polygon perimeter, cm
    expect(ringGirthCm(pos, nx, 6, 1.1)).toBeCloseTo(expected, 3)
  })

  it('returns null when the garment does not span that height', () => {
    const pos = tube(24, 4, 0.15, 1.5, 1.2) // a crop band 1.5→1.2
    expect(ringGirthCm(pos, 24, 4, 0.95)).toBeNull() // hip well below the hem
    expect(ringGirthCm(pos, 24, 4, 1.9)).toBeNull() // above the top
    expect(ringGirthCm(pos, 24, 4, 1.35)).not.toBeNull() // inside
  })

  it('slices at the interpolated radius on a cone (radius varies by height)', () => {
    // top ring radius 0.1 at y=1.4, bottom ring radius 0.3 at y=0.9
    const nx = 40
    const ny = 2
    const pos = new Float32Array(nx * ny * 3)
    const set = (iy: number, y: number, R: number): void => {
      for (let ix = 0; ix < nx; ix++) {
        const a = (ix / nx) * TAU
        const k = (iy * nx + ix) * 3
        pos[k] = Math.cos(a) * R
        pos[k + 1] = y
        pos[k + 2] = Math.sin(a) * R
      }
    }
    set(0, 1.4, 0.1)
    set(1, 0.9, 0.3)
    const poly = (R: number): number => nx * 2 * R * Math.sin(Math.PI / nx) * 100
    expect(ringGirthCm(pos, nx, ny, 1.15)!).toBeCloseTo(poly(0.2), 2) // halfway → interpolated R 0.2
    // radius grows toward the hem → girth grows as we slice lower
    expect(ringGirthCm(pos, nx, ny, 1.3)!).toBeLessThan(ringGirthCm(pos, nx, ny, 1.15)!)
    expect(ringGirthCm(pos, nx, ny, 1.15)!).toBeLessThan(ringGirthCm(pos, nx, ny, 1.0)!)
  })

  it('degenerates safely (too few columns / rings)', () => {
    expect(ringGirthCm(new Float32Array(6), 2, 1, 1)).toBeNull()
  })

  it('drapedGirths reports chest/waist/hip — including a hip the draft can’t give', () => {
    const nx = 48
    const R = 0.16
    const pos = tube(nx, 8, R, 1.5, 0.8) // spans chest·waist·hip
    const rows = drapedGirths({ positions: pos, nx, ny: 8 }, mann.measurements)
    expect(rows.map((r) => r.label)).toEqual(['Chest', 'Waist', 'Hip'])
    const poly = nx * 2 * R * Math.sin(Math.PI / nx) * 100
    for (const r of rows) expect(r.cm).toBeCloseTo(poly, 1) // constant-radius tube → same girth each height
  })

  it('a crop tube omits waist/hip', () => {
    const pos = tube(32, 4, 0.16, 1.5, mann.measurements.waistY + 0.05)
    expect(drapedGirths({ positions: pos, nx: 32, ny: 4 }, mann.measurements).map((r) => r.label)).toEqual(['Chest'])
  })
})

describe('draped fit — real drape clears the hip (fixes the drafted under-read)', () => {
  it('the draped dress hip ease is ≥ 0, not the drafted −17 cm', () => {
    const id: GarmentType = 'dress'
    const spec = garmentTubeSpecs(getGarment(id), { ...DEFAULT_PARAMS, ...getGarment(id).defaults }, mann.measurements)[0]
    const build = buildTubeGarment(spec)
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    for (let i = 0; i < 160; i++) solver.step(1 / 60)

    const hip = ringGirthCm(build.positions, build.nx, build.ny, mann.measurements.hipY)
    expect(hip).not.toBeNull()
    const bodyHip = TAU * mann.measurements.hipR * 100
    // the cloth is pushed out to (at least) the body, so the on-body hip clears it —
    // a small positive ease, nowhere near the drafted −17 cm the flat tube reports.
    expect(hip! - bodyHip).toBeGreaterThan(-3)
    expect(hip! - bodyHip).toBeLessThan(80) // sane upper bound (not exploded)
  }, 20000)
})
