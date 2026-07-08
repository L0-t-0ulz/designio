import type { BodyParams } from './Mannequin'

/**
 * **Made-to-measure**: map real body measurements (cm) ↔ the mannequin's internal
 * `BodyParams` multipliers, so you can type a size chart instead of nudging sliders.
 *
 * `BASE_MEASUREMENTS_CM` are the measurements of the size-1.0 body (height matches
 * the Height slider's `×175`). Girth multipliers stack `build × region`, so the
 * effective bust = base · build · bust — inverted here per field. Values clamp to
 * the sliders' valid range so the shaped body stays well-formed.
 */
export type MeasureKey = 'height' | 'bust' | 'waist' | 'hips'
export interface BodyMeasurementsCm {
  height: number
  bust: number
  waist: number
  hips: number
}

export const BASE_MEASUREMENTS_CM: BodyMeasurementsCm = { height: 175, bust: 88, waist: 68, hips: 94 }

// The mannequin's valid shaping range (matches the Avatar sliders).
const HEIGHT_RANGE: [number, number] = [0.85, 1.15]
const GIRTH_RANGE: [number, number] = [0.78, 1.3]
const clamp = (v: number, [lo, hi]: [number, number]): number => Math.max(lo, Math.min(hi, v))

/** Current body → real measurements (cm), accounting for build × per-region girth. */
export function bodyToMeasurements(p: BodyParams): BodyMeasurementsCm {
  return {
    height: BASE_MEASUREMENTS_CM.height * p.height,
    bust: BASE_MEASUREMENTS_CM.bust * p.build * p.bust,
    waist: BASE_MEASUREMENTS_CM.waist * p.build * p.waist,
    hips: BASE_MEASUREMENTS_CM.hips * p.build * p.hips
  }
}

/** Set one measurement (cm) on a body, returning updated params (others unchanged).
 *  Girth is set on the per-region multiplier, keeping the current overall `build`. */
export function setMeasurement(p: BodyParams, key: MeasureKey, cm: number): BodyParams {
  const np = { ...p }
  if (key === 'height') {
    np.height = clamp(cm / BASE_MEASUREMENTS_CM.height, HEIGHT_RANGE)
  } else {
    const base = BASE_MEASUREMENTS_CM[key] * p.build
    np[key] = clamp(base > 0 ? cm / base : 1, GIRTH_RANGE)
  }
  return np
}

export const cmToIn = (cm: number): number => cm / 2.54
export const inToCm = (inch: number): number => inch * 2.54

/** One size in a size chart (real cm). `height` optional (charts often omit it). */
export interface SizeChartRow {
  size: string
  bust: number
  waist: number
  hips: number
  height?: number
}

/** A built-in women's size chart (cm) as a starting point / import fallback. */
export const STANDARD_SIZE_CHART: SizeChartRow[] = [
  { size: 'XS', bust: 82, waist: 63, hips: 89 },
  { size: 'S', bust: 87, waist: 68, hips: 94 },
  { size: 'M', bust: 92, waist: 73, hips: 99 },
  { size: 'L', bust: 98, waist: 79, hips: 105 },
  { size: 'XL', bust: 104, waist: 85, hips: 111 },
  { size: 'XXL', bust: 112, waist: 93, hips: 119 }
]

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : NaN
}

/**
 * Parse a pasted size chart — JSON (an array of `{size,bust,waist,hips,height?}`)
 * **or** simple lines `Size, Bust, Waist, Hips[, Height]` (a header row + units are
 * ignored). Rows missing bust/waist/hips are dropped. Pure.
 */
export function parseSizeChart(text: string): SizeChartRow[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const rows: SizeChartRow[] = []
  if (trimmed[0] === '[' || trimmed[0] === '{') {
    try {
      const data = JSON.parse(trimmed)
      const arr = Array.isArray(data) ? data : [data]
      for (const r of arr) {
        const bust = num(r.bust)
        const waist = num(r.waist)
        const hips = num(r.hips ?? r.hip)
        if ([bust, waist, hips].some(Number.isNaN)) continue
        const height = num(r.height)
        rows.push({ size: String(r.size ?? r.name ?? rows.length + 1), bust, waist, hips, ...(Number.isNaN(height) ? {} : { height }) })
      }
      return rows
    } catch {
      return []
    }
  }
  // CSV / whitespace lines
  for (const line of trimmed.split(/\r?\n/)) {
    const cells = line.split(/[,\t;]+/).map((c) => c.trim())
    if (cells.length < 4) continue
    const bust = num(cells[1])
    const waist = num(cells[2])
    const hips = num(cells[3])
    if ([bust, waist, hips].some(Number.isNaN)) continue // header row / junk
    const height = num(cells[4])
    rows.push({ size: cells[0] || String(rows.length + 1), bust, waist, hips, ...(Number.isNaN(height) ? {} : { height }) })
  }
  return rows
}

/** Apply a size-chart row to a body (bust/waist/hips + height if the row has it). */
export function applySizeRow(p: BodyParams, row: SizeChartRow): BodyParams {
  let np = setMeasurement(p, 'bust', row.bust)
  np = setMeasurement(np, 'waist', row.waist)
  np = setMeasurement(np, 'hips', row.hips)
  if (row.height != null) np = setMeasurement(np, 'height', row.height)
  return np
}
