import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentMetrics } from '../src/renderer/export/garmentMetrics'
import { gradeParams, defaultLayer, sizeEase } from '../src/renderer/studio/document'

const mann = buildMannequin()
const M = mann.measurements
const C = mann.colliders
const paramsFor = (id: GarmentType): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment(id).defaults })
const metrics = (id: GarmentType, p: GarmentParams = paramsFor(id), size = 'M') =>
  garmentMetrics(getGarment(id).name, size, getGarment(id), p, M, C)
const label = (id: GarmentType, l: string): number | undefined =>
  metrics(id).rows.find((r) => r.label === l)?.cm

describe('garment metrics (production spec)', () => {
  it('reports the expected fields per garment kind', () => {
    expect(metrics('top').rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(['Chest', 'Waist', 'Hem sweep', 'Length', 'Sleeve length', 'Cuff'])
    )
    expect(metrics('skirt').rows.map((r) => r.label)).toEqual(['Waist', 'Hem sweep', 'Length'])
    expect(metrics('pants').rows.map((r) => r.label)).toEqual(
      expect.arrayContaining(['Waistband', 'Leg opening', 'Inseam'])
    )
  })

  it('chest circumference ≈ 2π·(chestR + ease)', () => {
    const p = paramsFor('top')
    const expected = 2 * Math.PI * (M.chestR + p.ease) * 100
    expect(Math.abs((label('top', 'Chest') ?? 0) - expected)).toBeLessThan(1) // < 1 cm
  })

  it('reports a positive fabric area + seam length', () => {
    const t = metrics('dress')
    expect(t.fabricM2).toBeGreaterThan(0)
    expect(t.seamCm).toBeGreaterThan(0)
  })

  it('grading up a size widens the girth (bigger chest)', () => {
    const base = defaultLayer('top')
    const m = garmentMetrics('Top', 'M', getGarment('top'), gradeParams({ ...base, size: 'M' }), M, C)
    const xl = garmentMetrics('Top', 'XL', getGarment('top'), gradeParams({ ...base, size: 'XL' }), M, C)
    const chestM = m.rows.find((r) => r.label === 'Chest')!.cm
    const chestXL = xl.rows.find((r) => r.label === 'Chest')!.cm
    expect(chestXL).toBeGreaterThan(chestM)
    // two steps M→XL ≈ +8 cm circumference
    expect(chestXL - chestM).toBeCloseTo(2 * Math.PI * sizeEase('XL') * 100, 1)
  })
})
