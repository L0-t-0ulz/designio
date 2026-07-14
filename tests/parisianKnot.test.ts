import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { knotCentre, parisianPinPairs, fillScarf, buildScarf, type ScarfSpec } from '../src/renderer/cloth/Garment'

const SPEC: ScarfSpec = { nx: 60, ny: 8, neckY: 1.5, wrapR: 0.08, width: 0.24, tailLen: 0.5, tailZ: 0.16, knot: true }
const v = new THREE.Vector3()

describe('the Parisian knot — centreline', () => {
  it('the fold is the bight tip, hanging at centre-front below the neck', () => {
    knotCentre(0.5, SPEC, v)
    expect(Math.abs(v.x)).toBeLessThan(0.01)
    expect(v.y).toBeCloseTo(SPEC.neckY - 0.16, 5)
    expect(v.z).toBeCloseTo(SPEC.tailZ, 5) // well in front
  })

  it('the doubled collar circles the whole neck — both halves, layered apart', () => {
    // sample each half mid-wrap: on the neck circle at neckY
    for (const u of [0.3, 0.7]) {
      knotCentre(u, SPEC, v)
      expect(v.y).toBeCloseTo(SPEC.neckY, 5)
      expect(Math.hypot(v.x, v.z)).toBeGreaterThan(SPEC.wrapR - 0.001)
      expect(Math.hypot(v.x, v.z)).toBeLessThan(SPEC.wrapR + 0.02)
    }
    // the layers never spawn coincident: same wrap angle, different radius
    const a = knotCentre(0.5 + 0.5 * (0.2 + 0.26), SPEC, new THREE.Vector3())
    const b = knotCentre(0.5 - 0.5 * (0.2 + 0.26), SPEC, new THREE.Vector3())
    expect(a.distanceTo(b)).toBeGreaterThan(0.005)
    // and each half sweeps PAST the back of the neck (z < 0 somewhere)
    let minZ = 1
    for (let t = 0.2; t < 0.72; t += 0.01) {
      knotCentre(0.5 + t / 2, SPEC, v)
      minZ = Math.min(minZ, v.z)
    }
    expect(minZ).toBeLessThan(-SPEC.wrapR * 0.8)
  })

  it('the tails hang from the front wrap exit down through the bight span', () => {
    for (const u of [0, 1]) {
      knotCentre(u, SPEC, v)
      expect(v.y).toBeCloseTo(SPEC.neckY - SPEC.tailLen, 5) // full drop at the tip
      expect(Math.abs(v.x)).toBeLessThan(0.05) // inside the bight's x-span
      expect(v.z).toBeGreaterThan(0.05) // in front of the chest
    }
  })

  it('pin pairs stitch each tail to its own side of the bight', () => {
    const pairs = parisianPinPairs(SPEC.nx, SPEC.ny)
    expect(pairs.length).toBe(2)
    for (const [i, j] of pairs) {
      expect(i).toBeGreaterThanOrEqual(0)
      expect(j).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(SPEC.nx * SPEC.ny)
      expect(j).toBeLessThan(SPEC.nx * SPEC.ny)
      expect(i % SPEC.nx).not.toBe(j % SPEC.nx) // distinct columns — a real stitch, not a no-op
    }
    // mirrored: the two tail columns sit either side of the fold
    const [t1, t2] = pairs.map(([i]) => i % SPEC.nx)
    expect(Math.sign(t1 - (SPEC.nx - 1) / 2)).toBe(-Math.sign(t2 - (SPEC.nx - 1) / 2))
  })

  it('the knot build pins only the collar — bight and tails drape free', () => {
    const build = buildScarf(SPEC)
    const pinnedCols = new Set(build.pinnedTop.map((i) => i % SPEC.nx))
    const foldCol = Math.round(0.5 * (SPEC.nx - 1))
    expect(pinnedCols.has(foldCol)).toBe(false) // the bight tip is free
    expect(pinnedCols.has(0)).toBe(false) // the tail tips are free
    expect(pinnedCols.has(SPEC.nx - 1)).toBe(false)
    expect(pinnedCols.size).toBeGreaterThan(10) // the collar band is held
  })

  it('knot and loose fills genuinely differ', () => {
    const a = new Float32Array(SPEC.nx * SPEC.ny * 3)
    const b = new Float32Array(SPEC.nx * SPEC.ny * 3)
    fillScarf(a, SPEC)
    fillScarf(b, { ...SPEC, knot: false })
    let diff = 0
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-6) diff++
    expect(diff).toBeGreaterThan(a.length / 2)
  })
})
