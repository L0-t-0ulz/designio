import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { doubleCentre, fillScarf, buildScarf, type ScarfSpec } from '../src/renderer/cloth/Garment'

const SPEC: ScarfSpec = { nx: 60, ny: 8, neckY: 1.5, wrapR: 0.08, width: 0.24, tailLen: 0.5, tailZ: 0.16, double: true }
const v = new THREE.Vector3()

// The wrap spans the middle of the length param; the two ends are the front tails.
const DBL_A = 0.18
const DBL_B = 0.82

describe('the double wrap — centreline', () => {
  it('the wrap rides the neck circle, spiralling down as it turns', () => {
    for (const u of [0.25, 0.5, 0.75]) {
      doubleCentre(u, SPEC, v)
      const r = Math.hypot(v.x, v.z)
      expect(r).toBeGreaterThan(SPEC.wrapR - 0.001) // on the neck circle
      expect(r).toBeLessThan(SPEC.wrapR + 0.018) // out to the second turn's radius
      expect(Math.abs(v.y - SPEC.neckY)).toBeLessThan(0.02) // hugs the neck height
    }
  })

  it('the two turns never spawn coincident — same azimuth, layered apart in radius + height', () => {
    // pick two wrap params one full turn apart (Δk = 2π / sweep) → same azimuth
    const dk = 2 / 3.3 // 2π / (3.3π)
    const k1 = 0.2
    const u1 = DBL_A + k1 * (DBL_B - DBL_A)
    const u2 = DBL_A + (k1 + dk) * (DBL_B - DBL_A)
    const a = doubleCentre(u1, SPEC, new THREE.Vector3())
    const b = doubleCentre(u2, SPEC, new THREE.Vector3())
    expect(a.distanceTo(b)).toBeGreaterThan(0.005) // the repulsion then holds them apart
  })

  it('each turn sweeps past the back of the neck (z < 0 somewhere)', () => {
    let minZ = 1
    for (let u = DBL_A; u <= DBL_B; u += 0.01) {
      doubleCentre(u, SPEC, v)
      minZ = Math.min(minZ, v.z)
    }
    expect(minZ).toBeLessThan(-SPEC.wrapR * 0.8)
  })

  it('the tails hang in front, shorter than a loose scarf (the wrap eats length)', () => {
    for (const u of [0, 1]) {
      doubleCentre(u, SPEC, v)
      expect(v.y).toBeLessThan(SPEC.neckY - 0.2) // hangs meaningfully below the neck
      expect(v.y).toBeGreaterThan(SPEC.neckY - SPEC.tailLen) // but higher than a full loose drop
      expect(v.z).toBeGreaterThan(0.05) // in front of the chest
      expect(Math.abs(v.x)).toBeLessThan(0.06) // gathered near centre-front
    }
  })

  it('the double build pins only the wrap back — the front crossings + tails drape free', () => {
    const build = buildScarf(SPEC)
    const pinnedCols = new Set(build.pinnedTop.map((i) => i % SPEC.nx))
    expect(pinnedCols.has(0)).toBe(false) // the tail tips are free
    expect(pinnedCols.has(SPEC.nx - 1)).toBe(false)
    // every pinned column sits inside the wrap span (never on a tail)
    for (const c of pinnedCols) {
      const u = c / (SPEC.nx - 1)
      expect(u).toBeGreaterThanOrEqual(DBL_A - 1e-6)
      expect(u).toBeLessThanOrEqual(DBL_B + 1e-6)
    }
    const wrapCols = Math.round((DBL_B - DBL_A) * SPEC.nx)
    expect(pinnedCols.size).toBeGreaterThan(8) // the back band is held
    expect(pinnedCols.size).toBeLessThan(wrapCols) // the front-facing crossings stay free
  })

  it('double and loose fills genuinely differ', () => {
    const a = new Float32Array(SPEC.nx * SPEC.ny * 3)
    const b = new Float32Array(SPEC.nx * SPEC.ny * 3)
    fillScarf(a, SPEC)
    fillScarf(b, { ...SPEC, double: false })
    let diff = 0
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-6) diff++
    expect(diff).toBeGreaterThan(a.length / 2)
  })
})
