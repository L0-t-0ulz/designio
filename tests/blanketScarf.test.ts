import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { blanketCentre, fillScarf, buildScarf, type ScarfSpec } from '../src/renderer/cloth/Garment'

const SPEC: ScarfSpec = { nx: 60, ny: 20, neckY: 1.5, wrapR: 0.08, width: 0.6, tailLen: 0.4, tailZ: 0.16, blanket: true }
const v = new THREE.Vector3()

describe('the blanket-scarf shoulder drape — the rail', () => {
  it('is left/right symmetric (u ↔ 1−u mirror across x)', () => {
    for (const u of [0, 0.1, 0.25, 0.4]) {
      const a = blanketCentre(u, SPEC, new THREE.Vector3())
      const b = blanketCentre(1 - u, SPEC, new THREE.Vector3())
      expect(a.x).toBeCloseTo(-b.x, 6)
      expect(a.y).toBeCloseTo(b.y, 6)
      expect(a.z).toBeCloseTo(b.z, 6)
    }
  })

  it('rests behind the neck at the centre (u = 0.5)', () => {
    blanketCentre(0.5, SPEC, v)
    expect(Math.abs(v.x)).toBeLessThan(1e-6) // centred
    expect(v.z).toBeLessThan(0) // behind the neck
    expect(v.y).toBeGreaterThan(SPEC.neckY) // up at the nape
  })

  it('reaches out over the shoulders (z ≈ 0) and the front tips sit in front, widest', () => {
    blanketCentre(0.25, SPEC, v)
    expect(v.x).toBeLessThan(0) // left of centre
    expect(Math.abs(v.z)).toBeLessThan(1e-6) // over the shoulder line
    // front tips: in front of the chest + the widest points of the whole rail
    const left = blanketCentre(0, SPEC, new THREE.Vector3())
    const right = blanketCentre(1, SPEC, new THREE.Vector3())
    expect(left.z).toBeGreaterThan(0.1)
    expect(right.z).toBeGreaterThan(0.1)
    let maxAbsX = 0
    for (let u = 0; u <= 1; u += 0.02) maxAbsX = Math.max(maxAbsX, Math.abs(blanketCentre(u, SPEC, v).x))
    expect(Math.abs(left.x)).toBeCloseTo(maxAbsX, 6) // the tip is the widest point
  })
})

describe('the blanket-scarf shoulder drape — fill + pinning', () => {
  it('the width hangs straight DOWN from the rail (row 0 = rail, last row = hem, a width below)', () => {
    const pos = new Float32Array(SPEC.nx * SPEC.ny * 3)
    fillScarf(pos, SPEC)
    const col = 30 // a mid column
    const top = pos[(0 * SPEC.nx + col) * 3 + 1]
    const hem = pos[((SPEC.ny - 1) * SPEC.nx + col) * 3 + 1]
    expect(top - hem).toBeCloseTo(SPEC.width, 5) // hangs one full width down
    // straight down: x + z unchanged along the column
    expect(pos[(0 * SPEC.nx + col) * 3]).toBeCloseTo(pos[((SPEC.ny - 1) * SPEC.nx + col) * 3], 6)
    expect(pos[(0 * SPEC.nx + col) * 3 + 2]).toBeCloseTo(pos[((SPEC.ny - 1) * SPEC.nx + col) * 3 + 2], 6)
  })

  it('pins the whole top rail so both front panels hang symmetrically', () => {
    const build = buildScarf(SPEC)
    const pinnedRows = build.pinnedTop.map((i) => Math.floor(i / SPEC.nx))
    const pinnedCols = new Set(build.pinnedTop.filter((i) => i < SPEC.nx))
    expect(pinnedCols.size).toBe(SPEC.nx) // every column's row-0 (the full rail) is pinned
    expect(Math.max(...pinnedRows)).toBeLessThan(SPEC.ny - 1) // never pins the hem (it must drape)
  })

  it('blanket and plain scarf fills genuinely differ', () => {
    const a = new Float32Array(SPEC.nx * SPEC.ny * 3)
    const b = new Float32Array(SPEC.nx * SPEC.ny * 3)
    fillScarf(a, SPEC)
    fillScarf(b, { ...SPEC, blanket: false })
    let diff = 0
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-6) diff++
    expect(diff).toBeGreaterThan(a.length / 2)
  })
})
