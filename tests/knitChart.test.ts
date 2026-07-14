import { describe, it, expect } from 'vitest'
import {
  KNIT_PRESETS,
  knitPreset,
  validateChart,
  knitHeight,
  knitRoughness,
  knitNormal,
  cloneChart,
  chartKey,
  type KnitChart,
  type KnitStitch
} from '../src/renderer/fabric/knitChart'
import { defaultLayer, cloneLayer, serializeDoc, parseDoc, captureColorway, applyColorway, docFromConfig } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

const stockinette = (): KnitChart => cloneChart(knitPreset('stockinette')!.chart)
const rib = (): KnitChart => cloneChart(knitPreset('rib-1x1')!.chart)

const tiles = (c: KnitChart): { tU: number; tV: number } => {
  const wales = c.rows[0].length
  const courses = c.rows.length
  return {
    tU: wales * Math.max(1, Math.round(12 / wales)),
    tV: courses * Math.max(1, Math.round(12 / courses))
  }
}

describe('knit chart presets', () => {
  it('all validate', () => {
    for (const p of KNIT_PRESETS) expect(validateChart(p.chart), p.id).toBeNull()
  })

  it('rib is columnar: knit wales stay high, purl wales stay low, along the full course', () => {
    const c = rib()
    const { tU, tV } = tiles(c)
    for (let i = 0; i < 20; i++) {
      const v = i / 20
      // sample each wale at its column centre (k wale 0 → tu 0.5/tU-cell 0)
      const kH = knitHeight(c, 0.5 / tU, v, tU, tV)
      const pH = knitHeight(c, 1.5 / tU, v, tU, tV)
      expect(kH).toBeGreaterThan(pH)
    }
  })

  it('garter alternates by course: purl-bump courses sit below knit courses at the wale centre', () => {
    const c = cloneChart(knitPreset('garter')!.chart)
    const { tU, tV } = tiles(c)
    const kCourse = knitHeight(c, 0.5 / tU, 0.5 / tV, tU, tV) // course 0 = k (chart bottom)
    const pCourse = knitHeight(c, 0.5 / tU, 1.5 / tV, tU, tV)
    expect(kCourse).toBeGreaterThan(pCourse)
  })

  it('a cable cross leans the column: the crossing course peaks off-centre', () => {
    const c = cloneChart(knitPreset('cable')!.chart)
    const { tU, tV } = tiles(c)
    // course 1 in chart storage = the 'cr' crossing course (authored top-down, stored bottom-up)
    const crossCourse = c.rows.findIndex((r) => r.includes('cr' as KnitStitch))
    expect(crossCourse).toBeGreaterThanOrEqual(0)
    const crWale = c.rows[crossCourse].indexOf('cr' as KnitStitch)
    // late in the course (tv → 1) a cr column's peak has moved right of the cell centre
    const u = (w: number): number => (crWale + w) / tU
    const vLate = (crossCourse + 0.9) / tV
    const centreH = knitHeight(c, u(0.5), vLate, tU, tV)
    const rightH = knitHeight(c, u(0.78), vLate, tU, tV)
    expect(rightH).toBeGreaterThan(centreH)
  })
})

describe('validateChart', () => {
  it('accepts presets and rejects malformed charts', () => {
    expect(validateChart({ rows: [] })).toMatch(/rows/)
    expect(validateChart({ rows: [['k'], ['k', 'p']] })).toMatch(/same width/)
    expect(validateChart({ rows: [['x' as KnitStitch]] })).toMatch(/unknown stitch/)
    expect(validateChart({ rows: [['k', 'p']] })).toBeNull()
  })
})

describe('knit height / roughness / normal fields', () => {
  it('height stays in [0, 1] and tiles seamlessly', () => {
    for (const p of KNIT_PRESETS) {
      const { tU, tV } = tiles(p.chart)
      for (let i = 0; i < 200; i++) {
        const u = (i * 0.617) % 1
        const v = (i * 0.371) % 1
        const h = knitHeight(p.chart, u, v, tU, tV)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(1)
        expect(knitHeight(p.chart, u + 1, v, tU, tV)).toBeCloseTo(h, 10)
        expect(knitHeight(p.chart, u, v - 1, tU, tV)).toBeCloseTo(h, 10)
      }
    }
  })

  it('roughness inverts the height in (0, 1]', () => {
    const c = rib()
    const { tU, tV } = tiles(c)
    let lo = 1
    let hi = 0
    for (let i = 0; i < 100; i++) {
      const r = knitRoughness(c, (i * 0.13) % 1, (i * 0.29) % 1, tU, tV)
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(1)
      lo = Math.min(lo, r)
      hi = Math.max(hi, r)
    }
    expect(lo).toBeLessThan(hi)
  })

  it('normals are unit length and average to +z', () => {
    const c = cloneChart(knitPreset('cable')!.chart)
    const { tU, tV } = tiles(c)
    let sz = 0
    const N = 400
    for (let i = 0; i < N; i++) {
      const [nx, ny, nz] = knitNormal(c, (i * 0.037) % 1, (i * 0.053) % 1, tU, tV, 3)
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 6)
      sz += nz
    }
    expect(sz / N).toBeGreaterThan(0.6)
  })
})

describe('chart identity + cloning', () => {
  it('chartKey is stable across clones and changes with any cell', () => {
    const a = rib()
    const b = cloneChart(a)
    expect(chartKey(b)).toBe(chartKey(a))
    b.rows[0][0] = 'p'
    expect(chartKey(b)).not.toBe(chartKey(a))
  })

  it('cloneChart is deep', () => {
    const a = stockinette()
    const b = cloneChart(a)
    b.rows[0][0] = 'p'
    expect(a.rows[0][0]).toBe('k')
  })
})

describe('knit chart persistence', () => {
  it('survives a .dio serialize → parse round trip', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].knitChart = knitPreset('cable')!.chart
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].knitChart).toBeDefined()
    expect(chartKey(back.layers[0].knitChart!)).toBe(chartKey(knitPreset('cable')!.chart))
  })

  it('cloneLayer deep-copies the chart; colorways capture + reapply it', () => {
    const l = defaultLayer()
    l.knitChart = cloneChart(knitPreset('seed')!.chart)
    const copy = cloneLayer(l)
    copy.knitChart!.rows[0][0] = 'k'
    expect(chartKey(l.knitChart!)).toBe(chartKey(knitPreset('seed')!.chart))

    const cw = captureColorway(l, 'seed way')
    const other = defaultLayer()
    applyColorway(other, cw)
    expect(other.knitChart).toBeDefined()
    expect(chartKey(other.knitChart!)).toBe(chartKey(l.knitChart!))
    other.knitChart!.rows[0][0] = 'k'
    expect(chartKey(l.knitChart!)).toBe(chartKey(knitPreset('seed')!.chart))
  })
})
