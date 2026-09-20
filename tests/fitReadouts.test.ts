import { describe, it, expect } from 'vitest'
import { rimArea, rimRadii, countNodes, drapeScore, drapeScoreOfRim, drapeLabel, drapeReadout } from '../src/renderer/export/drapeScore'
import * as THREE from 'three'
import type { Capsule } from '../src/renderer/avatar/colliders'
import { capsuleDistance, bodyDistance, slice, ringPerimeterCm, easeMap, bodyRadiusAt, clearanceVerdict, tightestZone } from '../src/renderer/export/easeMap'

/** A rim of `n` points at radius `r`, optionally with `k` folds of depth `d`. */
const rim = (n: number, r: number, k = 0, d = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const rr = r + (k ? d * Math.cos(k * a) : 0)
    return { x: Math.cos(a) * rr, z: Math.sin(a) * rr }
  })

describe('drape score', () => {
  it('measures a circular rim’s area as a circle’s', () => {
    expect(rimArea(rim(256, 0.4))).toBeCloseTo(Math.PI * 0.16, 3)
    expect(rimArea([])).toBe(0)
    expect(rimArea([{ x: 0, z: 0 }, { x: 1, z: 0 }])).toBe(0) // not a polygon
  })

  it('scores 1 when the hem hangs at its full pattern width', () => {
    // nothing has collapsed: the fabric is as far out as it can get
    const flat = 2 * Math.PI * 0.4
    expect(drapeScore(rim(128, 0.4), flat, 0.15).coefficient).toBeCloseTo(1, 2)
  })

  it('scores 0 when the hem has collapsed onto the body', () => {
    expect(drapeScore(rim(128, 0.15), 2 * Math.PI * 0.4, 0.15).coefficient).toBeCloseTo(0, 2)
  })

  it('scores in between for a hem part way out, and monotonically', () => {
    const flat = 2 * Math.PI * 0.5
    let prev = -1
    for (const r of [0.16, 0.2, 0.3, 0.4, 0.5]) {
      const c = drapeScore(rim(128, r), flat, 0.15).coefficient
      expect(c).toBeGreaterThan(prev)
      prev = c
    }
    expect(prev).toBeLessThanOrEqual(1)
  })

  it('reports 0 rather than nonsense when there is nothing to drape', () => {
    // a hem cut no bigger than the body it is on: the test is undefined
    const d = drapeScore(rim(64, 0.2), 2 * Math.PI * 0.2, 0.2)
    expect(Number.isFinite(d.coefficient)).toBe(true)
    expect(d.coefficient).toBe(0)
  })

  it('never leaves 0…1, even on a hem bigger than its own pattern', () => {
    const d = drapeScore(rim(64, 0.9), 2 * Math.PI * 0.4, 0.15)
    expect(d.coefficient).toBeLessThanOrEqual(1)
    expect(d.coefficient).toBeGreaterThanOrEqual(0)
  })

  it('counts the folds it is given', () => {
    for (const k of [3, 5, 8]) {
      expect(countNodes(rimRadii(rim(256, 0.4, k, 0.03))), `${k} folds`).toBe(k)
    }
  })

  it('finds no folds in a round hem', () => {
    // and does not inflate the count with mesh resolution: equal neighbouring
    // radii are one plateau, not one node each
    expect(countNodes(rimRadii(rim(256, 0.4)))).toBe(0)
    expect(countNodes(rimRadii(rim(40, 0.4)))).toBe(0)
  })

  it('ignores ripple below the threshold', () => {
    const noise = rimRadii(rim(256, 0.4, 20, 0.4 * 0.0005))
    expect(countNodes(noise)).toBe(0)
  })

  it('needs enough samples to call a fold at all', () => {
    expect(countNodes([1, 2, 1, 2])).toBe(0)
  })

  it('measures fold depth relative to the hem, so it scales with the garment', () => {
    const small = drapeScore(rim(200, 0.2, 6, 0.2 * 0.1), 2 * Math.PI * 0.3, 0.1)
    const big = drapeScore(rim(200, 0.8, 6, 0.8 * 0.1), 2 * Math.PI * 1.2, 0.4)
    expect(small.foldDepth).toBeCloseTo(big.foldDepth, 2)
  })

  it('reads out in words a person can act on', () => {
    expect(drapeLabel({ coefficient: 0.1, nodes: 2, foldDepth: 0, meanRadiusM: 0.2 })).toMatch(/^Clinging/)
    expect(drapeLabel({ coefficient: 0.9, nodes: 9, foldDepth: 0, meanRadiusM: 0.2 })).toMatch(/^Stiff/)
    expect(drapeReadout({ coefficient: 0.6, nodes: 1, foldDepth: 0, meanRadiusM: 0.2 })).toContain('1 fold')
    expect(drapeReadout({ coefficient: 0.6, nodes: 4, foldDepth: 0, meanRadiusM: 0.2 })).toContain('4 folds')
  })
})

/** A tube of `ny` rings from `y0` to `y1`, radius given per ring. */
const tube = (ny: number, nx: number, y0: number, y1: number, rAt: (t: number) => number): Float32Array => {
  const a = new Float32Array(nx * ny * 3)
  for (let iy = 0; iy < ny; iy++) {
    const t = ny === 1 ? 0 : iy / (ny - 1)
    const y = y0 + (y1 - y0) * t
    const r = rAt(t)
    for (let ix = 0; ix < nx; ix++) {
      const th = (ix / nx) * Math.PI * 2
      const k = (iy * nx + ix) * 3
      a[k] = Math.cos(th) * r
      a[k + 1] = y
      a[k + 2] = Math.sin(th) * r
    }
  }
  return a
}

/** A vertical torso capsule of radius `r` from y0 to y1. */
const torso = (r: number, y0 = 0.8, y1 = 1.5): Capsule[] => [
  { a: new THREE.Vector3(0, y0, 0), b: new THREE.Vector3(0, y1, 0), radius: r }
]

describe('clearance', () => {
  it('measures the signed distance to a capsule, negative inside', () => {
    const c = torso(0.15)[0]
    expect(capsuleDistance(new THREE.Vector3(0.25, 1.1, 0), c)).toBeCloseTo(0.1, 9)
    expect(capsuleDistance(new THREE.Vector3(0.15, 1.1, 0), c)).toBeCloseTo(0, 9)
    expect(capsuleDistance(new THREE.Vector3(0.05, 1.1, 0), c)).toBeCloseTo(-0.1, 9)
  })

  it('takes the nearest of the body’s capsules, not the first', () => {
    const body: Capsule[] = [
      { a: new THREE.Vector3(0, 0.8, 0), b: new THREE.Vector3(0, 1.5, 0), radius: 0.1 },
      { a: new THREE.Vector3(0.4, 0.8, 0), b: new THREE.Vector3(0.4, 1.5, 0), radius: 0.05 }
    ]
    // right next to the second capsule; the first is far away
    expect(bodyDistance(new THREE.Vector3(0.5, 1.1, 0), body)).toBeCloseTo(0.05, 9)
  })

  it('does not return Infinity for an empty body', () => {
    expect(bodyDistance(new THREE.Vector3(0, 1, 0), [])).toBe(0)
  })
})

describe('the slice', () => {
  it('cuts a true horizontal plane, one point per column', () => {
    const ring = slice(tube(5, 24, 1, 1.4, () => 0.3), 24, 5, 1.2)!
    expect(ring).toHaveLength(24)
    for (const p of ring) {
      expect(p.y).toBeCloseTo(1.2, 9)
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(0.3, 5)
    }
  })

  it('reports nothing where the garment does not reach', () => {
    const t = tube(5, 24, 1, 1.4, () => 0.3)
    expect(slice(t, 24, 5, 0.5)).toBeNull()
    expect(slice(t, 24, 5, 2)).toBeNull()
    expect(slice(t, 2, 1, 1.2)).toBeNull() // not a tube
  })

  it('measures a ring’s perimeter as a circle’s', () => {
    const ring = slice(tube(3, 128, 1, 1.4, () => 0.25), 128, 3, 1.2)!
    expect(ringPerimeterCm(ring)).toBeCloseTo(2 * Math.PI * 25, 0)
    expect(ringPerimeterCm([])).toBe(0)
  })
})

describe('ease map', () => {
  const garment = { positions: tube(9, 32, 0.9, 1.4, () => 0.25), nx: 32, ny: 9 }

  it('reports clearance per zone against the live body', () => {
    const rows = easeMap(garment, torso(0.15), [
      { label: 'Chest', y: 1.3 },
      { label: 'Waist', y: 1.05 }
    ])
    for (const r of rows) {
      expect(r.covered).toBe(true)
      expect(r.meanCm).toBeCloseTo(10, 0) // 25 cm cloth on a 15 cm body
      expect(r.minCm).toBeCloseTo(r.meanCm, 0) // a round body under a round garment
      expect(r.girthCm).toBeCloseTo(2 * Math.PI * 25, 0)
    }
  })

  it('goes negative where the cloth is inside the body', () => {
    const rows = easeMap(garment, torso(0.32), [{ label: 'Chest', y: 1.2 }])
    expect(rows[0].minCm).toBeLessThan(0)
    expect(clearanceVerdict(rows[0].minCm)).toBe('pinching')
  })

  it('reports an uncovered zone rather than dropping it', () => {
    const rows = easeMap(garment, torso(0.15), [{ label: 'Hip', y: 0.4 }])
    expect(rows).toHaveLength(1)
    expect(rows[0].covered).toBe(false)
  })

  it('finds the tightest point, which a mean would average away', () => {
    // squash one side of the body toward the cloth: the mean barely moves, the
    // minimum is the thing that fails
    const body: Capsule[] = [
      ...torso(0.15),
      { a: new THREE.Vector3(0.22, 0.9, 0), b: new THREE.Vector3(0.22, 1.4, 0), radius: 0.05 }
    ]
    const rows = easeMap(garment, body, [{ label: 'Chest', y: 1.2 }])
    expect(rows[0].minCm).toBeLessThan(rows[0].meanCm)
    expect(rows[0].minCm).toBeLessThan(2)
  })

  it('grades a clearance the way a fitter would', () => {
    expect(clearanceVerdict(-0.5)).toBe('pinching')
    expect(clearanceVerdict(0.3)).toBe('skimming')
    expect(clearanceVerdict(1.5)).toBe('easy')
    expect(clearanceVerdict(8)).toBe('loose')
  })

  it('names the zone that will fail first, and nothing when none is covered', () => {
    const rows = easeMap(garment, torso(0.15), [
      { label: 'Chest', y: 1.3 },
      { label: 'Hip', y: 0.4 }
    ])
    expect(tightestZone(rows)?.label).toBe('Chest')
    expect(tightestZone(easeMap(garment, torso(0.15), [{ label: 'Hip', y: 0.4 }]))).toBeNull()
  })
})

describe('drapeScoreOfRim', () => {
  it('scores a round hem at 1 without being told its pattern length', () => {
    expect(drapeScoreOfRim(rim(256, 0.4), 0.15).coefficient).toBeCloseTo(1, 2)
  })

  it('scores a folded hem below a round one of the same perimeter', () => {
    // the isoperimetric reading: folds keep the perimeter and lose the area
    const folded = rim(256, 0.4, 7, 0.06)
    const round = rim(256, 0.4)
    expect(drapeScoreOfRim(folded, 0.15).coefficient).toBeLessThan(drapeScoreOfRim(round, 0.15).coefficient)
  })

  it('still counts the folds it is scoring', () => {
    expect(drapeScoreOfRim(rim(256, 0.4, 7, 0.06), 0.15).nodes).toBe(7)
  })
})

describe('bodyRadiusAt', () => {
  it('reaches to the far side of a capsule that is off the centre line', () => {
    // at knee height nothing contains the centre line — the legs are out on
    // either side — so "the radius of the containing capsule" is zero and wrong
    const legs: Capsule[] = [
      { a: new THREE.Vector3(-0.13, 0.1, 0), b: new THREE.Vector3(-0.13, 0.5, 0), radius: 0.06 },
      { a: new THREE.Vector3(0.13, 0.1, 0), b: new THREE.Vector3(0.13, 0.5, 0), radius: 0.06 }
    ]
    expect(bodyRadiusAt(legs, 0.3)).toBeCloseTo(0.19, 9)
  })

  it('takes the furthest reach when capsules overlap in height', () => {
    const body: Capsule[] = [
      { a: new THREE.Vector3(0, 0.9, 0), b: new THREE.Vector3(0, 1.4, 0), radius: 0.15 },
      { a: new THREE.Vector3(0.25, 0.9, 0), b: new THREE.Vector3(0.25, 1.4, 0), radius: 0.05 }
    ]
    expect(bodyRadiusAt(body, 1.1)).toBeCloseTo(0.3, 9)
  })

  it('includes a capsule’s end caps in the height it spans', () => {
    const c: Capsule[] = [{ a: new THREE.Vector3(0, 1, 0), b: new THREE.Vector3(0, 1.2, 0), radius: 0.1 }]
    expect(bodyRadiusAt(c, 0.95)).toBeGreaterThan(0) // inside the bottom cap
    expect(bodyRadiusAt(c, 0.85)).toBe(0) // below it entirely
  })

  it('is zero where the body is not', () => {
    expect(bodyRadiusAt([], 1)).toBe(0)
  })
})
