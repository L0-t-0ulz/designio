import { describe, it, expect } from 'vitest'
import { YARN_PRESETS, yarnPreset, validateYarn, yarnHand, yarnAdjustedFabric, yarnLabel, DK_TEX, type YarnSpec } from '../src/renderer/fabric/yarn'
import { getFabric, fabricToSolverParams } from '../src/renderer/fabric/FabricLibrary'
import { defaultLayer, cloneLayer, serializeDoc, parseDoc, captureColorway, applyColorway, docFromConfig } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

const dk: YarnSpec = { tex: DK_TEX, ply: 4, twist: 0.5 }

describe('yarn validation + presets', () => {
  it('all presets validate', () => {
    for (const p of YARN_PRESETS) expect(validateYarn(p.yarn), p.id).toBeNull()
  })

  it('rejects out-of-range specs', () => {
    expect(validateYarn({ ...dk, tex: 5 })).toMatch(/count/)
    expect(validateYarn({ ...dk, ply: 0 })).toMatch(/ply/)
    expect(validateYarn({ ...dk, ply: 2.5 })).toMatch(/ply/)
    expect(validateYarn({ ...dk, twist: 1.2 })).toMatch(/twist/)
  })
})

describe('yarnHand', () => {
  it('chunkier yarn = heavier, coarser, deeper; finer = the reverse', () => {
    const lace = yarnHand(yarnPreset('lace')!.yarn)
    const chunky = yarnHand(yarnPreset('chunky')!.yarn)
    expect(chunky.gsmScale).toBeGreaterThan(1)
    expect(lace.gsmScale).toBeLessThan(1)
    expect(chunky.weaveScale).toBeLessThan(1) // fewer, bigger stitches
    expect(lace.weaveScale).toBeGreaterThan(1)
    expect(chunky.normalScale).toBeGreaterThan(lace.normalScale)
  })

  it('more twist = crisper + springier; a soft single is limper and fuzzier', () => {
    const crepe = yarnHand(yarnPreset('crepe')!.yarn)
    const single = yarnHand(yarnPreset('single-ply')!.yarn)
    expect(crepe.bendScale).toBeLessThan(single.bendScale) // crisper springs back
    expect(crepe.stretchScale).toBeGreaterThan(single.stretchScale)
    expect(single.roughnessDelta).toBeGreaterThan(0) // fuzzy halo is matte
    expect(single.sheenDelta).toBeGreaterThan(crepe.sheenDelta)
  })

  it('DK 4-ply standard twist is near-neutral', () => {
    const h = yarnHand(dk)
    expect(h.gsmScale).toBeCloseTo(1, 5)
    expect(h.weaveScale).toBeCloseTo(1, 5)
    expect(h.normalScale).toBeCloseTo(1, 5)
    expect(Math.abs(h.roughnessDelta)).toBeLessThan(1e-9)
  })
})

describe('yarnAdjustedFabric', () => {
  it('keeps every adjusted field inside the library ranges, for every preset × fabric', () => {
    for (const p of YARN_PRESETS) {
      for (const id of ['jersey-knit', 'chiffon', 'denim', 'cable-knit']) {
        const f = yarnAdjustedFabric(getFabric(id), p.yarn)
        expect(f.gsm).toBeGreaterThanOrEqual(40)
        expect(f.gsm).toBeLessThanOrEqual(800)
        expect(f.bendiness).toBeGreaterThan(0)
        expect(f.bendiness).toBeLessThanOrEqual(1)
        expect(f.stretch).toBeGreaterThanOrEqual(0)
        expect(f.stretch).toBeLessThanOrEqual(1)
        expect(f.roughness).toBeGreaterThan(0)
        expect(f.roughness).toBeLessThanOrEqual(1)
        expect(f.sheen).toBeGreaterThanOrEqual(0)
        expect(f.sheen).toBeLessThanOrEqual(1)
        expect(f.weaveScale).toBeGreaterThanOrEqual(30)
      }
    }
  })

  it('actually changes the drape: chunky yarn drapes heavier than lace on the same fabric', () => {
    const base = getFabric('jersey-knit')
    const lace = fabricToSolverParams(yarnAdjustedFabric(base, yarnPreset('lace')!.yarn))
    const chunky = fabricToSolverParams(yarnAdjustedFabric(base, yarnPreset('chunky')!.yarn))
    expect(chunky.mass).toBeGreaterThan(lace.mass)
    expect(lace.aero).toBeGreaterThan(chunky.aero) // the light cloth catches the air
  })

  it('no yarn (or an invalid one) returns the fabric untouched', () => {
    const base = getFabric('denim')
    expect(yarnAdjustedFabric(base)).toBe(base)
    expect(yarnAdjustedFabric(base, { tex: 1, ply: 1, twist: 0.5 })).toBe(base)
  })
})

describe('yarnLabel', () => {
  it('names a preset, describes a custom spec', () => {
    expect(yarnLabel(yarnPreset('worsted')!.yarn)).toBe('Worsted')
    expect(yarnLabel({ tex: 80, ply: 2, twist: 0.8 })).toBe('80 tex · 2-ply · high twist')
  })
})

describe('yarn persistence', () => {
  it('survives a .dio round trip; colorways + cloneLayer deep-copy it', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].yarn = { ...yarnPreset('chunky')!.yarn }
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].yarn).toEqual(yarnPreset('chunky')!.yarn)

    const l = defaultLayer()
    l.yarn = { ...yarnPreset('crepe')!.yarn }
    const copy = cloneLayer(l)
    copy.yarn!.tex = 200
    expect(l.yarn.tex).toBe(yarnPreset('crepe')!.yarn.tex)

    const cw = captureColorway(l, 'crepe way')
    const other = defaultLayer()
    applyColorway(other, cw)
    expect(other.yarn).toEqual(l.yarn)
    other.yarn!.ply = 8
    expect(l.yarn.ply).toBe(yarnPreset('crepe')!.yarn.ply)
  })
})

describe('beanie gauge presets', () => {
  it('every gauge references a real yarn preset and a real knit chart', async () => {
    const { BEANIE_GAUGES } = await import('../src/renderer/fabric/yarn')
    const { knitPreset } = await import('../src/renderer/fabric/knitChart')
    for (const g of BEANIE_GAUGES) {
      expect(yarnPreset(g.yarn), `${g.id} yarn`).toBeDefined()
      expect(knitPreset(g.chart), `${g.id} chart`).toBeDefined()
    }
  })

  it('gauges get chunkier monotonically (heavier yarn down the list)', async () => {
    const { BEANIE_GAUGES } = await import('../src/renderer/fabric/yarn')
    const texes = BEANIE_GAUGES.map((g) => yarnPreset(g.yarn)!.yarn.tex)
    for (let i = 1; i < texes.length; i++) expect(texes[i]).toBeGreaterThanOrEqual(texes[i - 1])
  })
})
