import { describe, it, expect } from 'vitest'
import { parseScanOBJ, ellipsePerimeter, sliceGirthCm, scanToMeasurements, type Vec3 } from '../src/renderer/avatar/bodyScan'

// a synthetic body: elliptical rings stacked up 1.7 m, wider at chest + hip than waist
const syntheticBody = (): Vec3[] => {
  const verts: Vec3[] = []
  const ring = (y: number, a: number, b: number): void => {
    for (let i = 0; i < 48; i++) {
      const t = (i / 48) * Math.PI * 2
      verts.push({ x: Math.cos(t) * a, y, z: Math.sin(t) * b })
    }
  }
  for (let k = 0; k <= 40; k++) {
    const y = (k / 40) * 1.7 // 0 → 1.7 m
    const f = k / 40
    // waist (f≈0.62) pinched, chest (0.72) + hip (0.52) fuller
    const a = 0.16 - 0.05 * Math.exp(-((f - 0.62) ** 2) / 0.002) + 0.02 * Math.exp(-((f - 0.72) ** 2) / 0.004)
    ring(y, a, a * 0.62)
  }
  return verts
}

describe('3D body-scan import', () => {
  it('parses OBJ vertex lines, ignoring faces/normals/comments', () => {
    const obj = '# comment\nv 1.0 2.0 3.0\nvn 0 1 0\nvt 0 0\nf 1 2 3\nv -0.5 0.25 0.75\n'
    const v = parseScanOBJ(obj)
    expect(v).toHaveLength(2)
    expect(v[0]).toEqual({ x: 1, y: 2, z: 3 })
    expect(v[1]).toEqual({ x: -0.5, y: 0.25, z: 0.75 })
  })

  it('ellipse perimeter matches a circle + grows with the axes', () => {
    expect(ellipsePerimeter(1, 1)).toBeCloseTo(2 * Math.PI, 3) // a circle
    expect(ellipsePerimeter(2, 1)).toBeGreaterThan(ellipsePerimeter(1, 1))
  })

  it('derives a plausible height + chest/waist/hip from a scan', () => {
    const m = scanToMeasurements(syntheticBody())
    expect(m.heightCm).toBeCloseTo(170, 0) // 1.7 m body
    expect(m.chestCm).toBeGreaterThan(0)
    expect(m.waistCm).toBeGreaterThan(0)
    // the pinched waist reads smaller than the chest + hips
    expect(m.waistCm).toBeLessThan(m.chestCm)
    expect(m.waistCm).toBeLessThan(m.hipCm)
  })

  it('an empty cloud yields zeroes (no crash)', () => {
    expect(scanToMeasurements([])).toEqual({ heightCm: 0, chestCm: 0, waistCm: 0, hipCm: 0 })
    expect(sliceGirthCm([], 0.5)).toBe(0)
  })
})
