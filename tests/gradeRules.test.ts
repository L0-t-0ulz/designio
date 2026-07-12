import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { getGarment } from '../src/renderer/garments/registry'
import {
  DEFAULT_GRADE_RULES,
  SIZES,
  defaultLayer,
  gradeEase,
  gradeParams,
  parseDoc,
  serializeDoc,
  sizeEase,
  type GradeRules,
  type ProjectDoc
} from '../src/renderer/studio/document'
import { pomTable } from '../src/renderer/export/pom'

const mann = buildMannequin()
const M = mann.measurements
const C = mann.colliders

const RULES: GradeRules = { girthCm: 4, lengthCm: 2, sleeveCm: 1 }

describe('grade rules (per-point size grading)', () => {
  it('default rules reproduce the historical uniform girth grade exactly', () => {
    const l = defaultLayer('dress')
    for (const size of SIZES) {
      const p = gradeParams({ ...l, size })
      expect(p.ease).toBeCloseTo(Math.max(0, l.ease + sizeEase(size)), 10)
      expect(p.lengthGradeM).toBe(0)
      expect(p.sleeveGradeM).toBe(0)
    }
    expect(gradeEase('L')).toBeCloseTo(sizeEase('L'), 10)
    expect(DEFAULT_GRADE_RULES).toEqual({ girthCm: 4, lengthCm: 0, sleeveCm: 0 })
  })

  it('girth rule scales the ease step; M (the drafted block) never grades', () => {
    const double: GradeRules = { ...DEFAULT_GRADE_RULES, girthCm: 8 }
    expect(gradeEase('L', double)).toBeCloseTo(2 * gradeEase('L'), 10)
    expect(gradeEase('M', double)).toBe(0)
    expect(gradeEase('XS', double)).toBeCloseTo(-2 * 8 * 0.0016, 10)
  })

  it('length/sleeve rules become signed metre offsets by size step', () => {
    const l = { ...defaultLayer('dress'), gradeRules: RULES }
    expect(gradeParams({ ...l, size: 'L' }).lengthGradeM).toBeCloseTo(0.02, 10) // +1 step × 2 cm
    expect(gradeParams({ ...l, size: 'XS' }).lengthGradeM).toBeCloseTo(-0.04, 10) // −2 steps
    expect(gradeParams({ ...l, size: 'XXL' }).sleeveGradeM).toBeCloseTo(0.03, 10) // +3 steps × 1 cm
    expect(gradeParams({ ...l, size: 'M' }).lengthGradeM).toBe(0)
  })

  it('POM: a length rule makes the Length row step ~lengthCm per size (default stays flat)', () => {
    const flat = pomTable(getGarment('dress'), defaultLayer('dress'), M, C)
    const flatLen = flat.rows.find((r) => r.label === 'Length')!
    for (const s of SIZES) expect(flatLen.bySize[s]).toBeCloseTo(flatLen.bySize.M, 5)

    const graded = pomTable(getGarment('dress'), { ...defaultLayer('dress'), gradeRules: RULES }, M, C)
    const len = graded.rows.find((r) => r.label === 'Length')!
    expect(len.bySize.L - len.bySize.M).toBeCloseTo(RULES.lengthCm, 1)
    expect(len.bySize.XS - len.bySize.M).toBeCloseTo(-2 * RULES.lengthCm, 1)
  })

  it('POM: a sleeve rule steps the sleeve row without touching the chest girth grade', () => {
    const graded = pomTable(getGarment('top'), { ...defaultLayer('top'), sleeve: 'long', gradeRules: RULES }, M, C)
    const sleeve = graded.rows.find((r) => r.label === 'Sleeve length')!
    expect(sleeve.bySize.XL - sleeve.bySize.M).toBeCloseTo(2 * RULES.sleeveCm, 1)
    // chest still grades by the girth rule alone
    const chest = graded.rows.find((r) => r.label === 'Chest')!
    expect(chest.bySize.L - chest.bySize.M).toBeCloseTo(2 * Math.PI * RULES.girthCm * 0.0016 * 100, 1)
  })

  it('POM: legs grade the same direction as the body — a length rule LENGTHENS the inseam', () => {
    // regression: legTubeSpecs subtracts lengthGradeM from hemY (lower = longer) while
    // bodyTubeToSpec adds it to hemDrop — opposite arithmetic, same direction.
    const graded = pomTable(getGarment('pants'), { ...defaultLayer('pants'), gradeRules: RULES }, M, C)
    const inseam = graded.rows.find((r) => r.label === 'Inseam')!
    expect(inseam.bySize.L - inseam.bySize.M).toBeCloseTo(RULES.lengthCm, 1) // longer per size up
    expect(inseam.bySize.XS - inseam.bySize.M).toBeCloseTo(-2 * RULES.lengthCm, 1) // shorter per size down
  })

  it('round-trips through serialize/parse (.dio)', () => {
    const doc: ProjectDoc = {
      version: 1,
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      scene: { gravity: 9.81, windX: 0, windZ: 0, animMode: 'static', animSpeed: 1 },
      layers: [{ ...defaultLayer('dress'), gradeRules: RULES }, defaultLayer('top')],
      activeIndex: 0
    }
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].gradeRules).toEqual(RULES)
    expect(back.layers[1].gradeRules).toBeUndefined() // absent = default rules
  })
})
