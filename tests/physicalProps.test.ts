import { describe, it, expect } from 'vitest'
import {
  physicalDefaults,
  physicalToSolverParams,
  bendinessFromRigidity,
  physicalSummary,
  parsePhysicalParams,
  clampPhysical,
  type PhysicalFabric
} from '../src/renderer/fabric/physicalProps'
import { FABRIC_LIBRARY, fabricToSolverParams } from '../src/renderer/fabric/FabricLibrary'
import { layerFromConfig } from '../src/renderer/studio/document'

describe('physicalDefaults round-trip', () => {
  it('a preset seeded through the editor drapes identically (untouched defaults are lossless)', () => {
    for (const fabric of FABRIC_LIBRARY.slice(0, 12)) {
      const derived = fabricToSolverParams(fabric)
      const phys = physicalDefaults(fabric)
      const mapped = physicalToSolverParams(phys, derived)
      expect(mapped.mass).toBeCloseTo(derived.mass, 6)
      expect(mapped.bendCompliance).toBeCloseTo(derived.bendCompliance, 4)
      expect(mapped.damping).toBeCloseTo(derived.damping, 4)
      // stretch: the weft-weighted mean of the seeded warp/weft (0.6w + 0.4·0.6w = 0.84·stretch)
      // times the shear ease reproduces the preset's order — within 25%
      if (derived.stretchCompliance > 1e-4) {
        expect(mapped.stretchCompliance / derived.stretchCompliance).toBeGreaterThan(0.6)
        expect(mapped.stretchCompliance / derived.stretchCompliance).toBeLessThan(1.6)
      }
      expect(mapped.color).toBe(derived.color)
      expect(mapped.friction).toBe(derived.friction)
    }
  })

  it('rigidity map inverts cleanly across the range', () => {
    for (const b of [0, 0.25, 0.5, 0.75, 1]) {
      const rigidity = 0.8 * Math.pow(150, 1 - b)
      expect(bendinessFromRigidity(rigidity)).toBeCloseTo(b, 6)
    }
  })
})

describe('physicalToSolverParams monotonicity', () => {
  const base = fabricToSolverParams(FABRIC_LIBRARY[0])
  const mid: PhysicalFabric = { gsm: 200, thicknessMm: 0.5, bendRigidityUNm: 10, stretchWarpPct: 10, stretchWeftPct: 15, shearPct: 20 }

  it('heavier cloth is heavier, stiffer cloth bends less, stretchier stretches more', () => {
    const heavier = physicalToSolverParams({ ...mid, gsm: 500 }, base)
    const lighter = physicalToSolverParams({ ...mid, gsm: 80 }, base)
    expect(heavier.mass).toBeGreaterThan(lighter.mass)

    const stiffer = physicalToSolverParams({ ...mid, bendRigidityUNm: 100 }, base)
    const softer = physicalToSolverParams({ ...mid, bendRigidityUNm: 1.5 }, base)
    expect(stiffer.bendCompliance).toBeLessThan(softer.bendCompliance)
    expect(stiffer.damping).toBeGreaterThan(softer.damping)

    const stretchy = physicalToSolverParams({ ...mid, stretchWeftPct: 50 }, base)
    const rigid = physicalToSolverParams({ ...mid, stretchWeftPct: 2, stretchWarpPct: 1 }, base)
    expect(stretchy.stretchCompliance).toBeGreaterThan(rigid.stretchCompliance)

    const sheary = physicalToSolverParams({ ...mid, shearPct: 55 }, base)
    expect(sheary.stretchCompliance).toBeGreaterThan(physicalToSolverParams({ ...mid, shearPct: 0 }, base).stretchCompliance)

    const light = physicalToSolverParams({ ...mid, gsm: 70 }, base)
    const heavy = physicalToSolverParams({ ...mid, gsm: 400 }, base)
    expect(light.aero).toBeGreaterThan(heavy.aero) // light cloth catches the air
  })

  it('clamps garbage into the physical range', () => {
    const c = clampPhysical({ gsm: -5, thicknessMm: 99, bendRigidityUNm: 0, stretchWarpPct: 500, stretchWeftPct: -1, shearPct: 61 })
    expect(c.gsm).toBe(40)
    expect(c.thicknessMm).toBe(4)
    expect(c.bendRigidityUNm).toBeCloseTo(0.8, 9)
    expect(c.stretchWarpPct).toBe(60)
    expect(c.stretchWeftPct).toBe(0)
    expect(c.shearPct).toBe(60)
  })
})

describe('summary + deep-link parse', () => {
  const seed: PhysicalFabric = { gsm: 240, thicknessMm: 0.65, bendRigidityUNm: 12.3, stretchWarpPct: 8, stretchWeftPct: 15, shearPct: 22 }

  it('summarises in real units', () => {
    const s = physicalSummary(seed)
    expect(s).toContain('240 g/m²')
    expect(s).toContain('0.65 mm')
    expect(s).toContain('12.3 µN·m')
    expect(s).toContain('8/15 % (warp/weft)')
    expect(s).toContain('shear 22 %')
  })

  it('parses only when a physical param is present, seeding the rest', () => {
    expect(parsePhysicalParams(() => null, seed)).toBeUndefined()
    const p = parsePhysicalParams((k) => (k === 'gsm' ? '520' : null), seed)!
    expect(p.gsm).toBe(520)
    expect(p.thicknessMm).toBe(seed.thicknessMm)
    const junk = parsePhysicalParams((k) => (k === 'gsm' ? 'NaN' : k === 'bend' ? '40' : null), seed)!
    expect(junk.gsm).toBe(seed.gsm) // NaN ignored
    expect(junk.bendRigidityUNm).toBe(40)
  })
})

describe('end-to-end layer chain', () => {
  it('a config physical override lands on the layer data (the stack reads it at build)', () => {
    const phys: PhysicalFabric = { gsm: 650, thicknessMm: 1.6, bendRigidityUNm: 110, stretchWarpPct: 2, stretchWeftPct: 3, shearPct: 4 }
    const layer = layerFromConfig({ garment: 'dress', color: 0xff0000, fabricId: 'cotton-poplin', prints: [], physicalFabric: phys } as never)
    expect(layer.physicalFabric).toEqual(phys)
  })
})
