import { describe, it, expect } from 'vitest'
import {
  BASE_MEASUREMENTS_CM,
  bodyToMeasurements,
  setMeasurement,
  cmToIn,
  inToCm,
  parseSizeChart,
  applySizeRow,
  STANDARD_SIZE_CHART
} from '../src/renderer/avatar/measure'
import { DEFAULT_BODY, type BodyParams } from '../src/renderer/avatar/Mannequin'

const body = (over: Partial<BodyParams> = {}): BodyParams => ({ ...DEFAULT_BODY, ...over })

describe('made-to-measure — cm ↔ body params', () => {
  it('the default body reads as the base measurements', () => {
    const m = bodyToMeasurements(body())
    expect(m.height).toBeCloseTo(BASE_MEASUREMENTS_CM.height, 5)
    expect(m.bust).toBeCloseTo(BASE_MEASUREMENTS_CM.bust, 5)
    expect(m.waist).toBeCloseTo(BASE_MEASUREMENTS_CM.waist, 5)
    expect(m.hips).toBeCloseTo(BASE_MEASUREMENTS_CM.hips, 5)
  })

  it('typing a measurement then reading it back round-trips (within clamp range)', () => {
    let p = body()
    p = setMeasurement(p, 'bust', 92)
    p = setMeasurement(p, 'waist', 70)
    p = setMeasurement(p, 'hips', 100)
    p = setMeasurement(p, 'height', 168)
    const m = bodyToMeasurements(p)
    expect(m.bust).toBeCloseTo(92, 4)
    expect(m.waist).toBeCloseTo(70, 4)
    expect(m.hips).toBeCloseTo(100, 4)
    expect(m.height).toBeCloseTo(168, 4)
  })

  it('setting one measurement leaves the others unchanged', () => {
    const p = setMeasurement(body(), 'waist', 60)
    const m = bodyToMeasurements(p)
    expect(m.bust).toBeCloseTo(BASE_MEASUREMENTS_CM.bust, 4) // untouched
    expect(m.waist).toBeCloseTo(60, 4)
  })

  it('keeps the per-region multiplier consistent when build ≠ 1', () => {
    const p = setMeasurement(body({ build: 1.1 }), 'bust', 99)
    expect(bodyToMeasurements(p).bust).toBeCloseTo(99, 4) // effective bust honours build
  })

  it('clamps out-of-range measurements to keep the body well-formed', () => {
    const huge = bodyToMeasurements(setMeasurement(body(), 'bust', 400))
    const tiny = bodyToMeasurements(setMeasurement(body(), 'bust', 10))
    expect(huge.bust).toBeLessThan(400) // clamped down
    expect(tiny.bust).toBeGreaterThan(10) // clamped up
  })

  it('cm/in helpers invert each other', () => {
    expect(inToCm(cmToIn(90))).toBeCloseTo(90, 6)
    expect(cmToIn(2.54)).toBeCloseTo(1, 6)
  })

  it('parses a JSON size chart', () => {
    const rows = parseSizeChart('[{"size":"M","bust":92,"waist":73,"hips":99},{"size":"L","bust":98,"waist":79,"hip":105,"height":170}]')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ size: 'M', bust: 92, waist: 73, hips: 99 })
    expect(rows[1].hips).toBe(105) // accepts "hip" too
    expect(rows[1].height).toBe(170)
  })

  it('parses a CSV size chart and skips the header row', () => {
    const rows = parseSizeChart('Size,Bust,Waist,Hips\nS,87,68,94\nM,92,73,99')
    expect(rows.map((r) => r.size)).toEqual(['S', 'M'])
    expect(rows[1].bust).toBe(92)
  })

  it('rejects junk gracefully (empty result, no throw)', () => {
    expect(parseSizeChart('')).toEqual([])
    expect(parseSizeChart('not a chart at all')).toEqual([])
    expect(parseSizeChart('{bad json')).toEqual([])
  })

  it('applies a size-chart row to the body', () => {
    const p = applySizeRow(body(), STANDARD_SIZE_CHART.find((r) => r.size === 'L')!)
    const m = bodyToMeasurements(p)
    expect(m.bust).toBeCloseTo(98, 3)
    expect(m.hips).toBeCloseTo(105, 3)
  })
})
