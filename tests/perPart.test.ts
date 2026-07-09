import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc, gradeParams } from '../src/renderer/studio/document'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'
import { garmentMetrics } from '../src/renderer/export/garmentMetrics'
import { manufactureHTML, manufactureJSON, type ManufactureBundle } from '../src/renderer/export/manufacture'
import { fabricToSolverParams, getFabric } from '../src/renderer/fabric/FabricLibrary'
import { partForPiece, panelFabricId } from '../src/renderer/studio/GarmentStack'
import type { GarmentLayerData } from '../src/renderer/studio/document'

const mann = buildMannequin()

describe('per-part fabric · trim · seam allowance', () => {
  it('per-part fabric + trim + seam round-trip through save/parse', () => {
    const c = defaultConfig()
    c.partFabrics = { sleeves: { fabricId: 'leather', color: 0x442200 } }
    c.trim = true
    c.trimColor = 0xd9c27e
    c.seam = 15
    const back = parseDoc(serializeDoc(docFromConfig(c)))
    const l = back.layers[0]
    expect(l.partFabrics?.sleeves).toEqual({ fabricId: 'leather', color: 0x442200 })
    expect(l.trim).toBe(true)
    expect(l.seam).toBe(15)
  })

  it('cloneLayer deep-copies partFabrics (duplicate is independent)', () => {
    const base = defaultLayer('long-sleeve')
    base.partFabrics = { sleeves: { fabricId: 'leather', color: 0x111111 } }
    const copy = cloneLayer(base)
    copy.partFabrics!.sleeves!.color = 0x999999
    expect(base.partFabrics!.sleeves!.color).toBe(0x111111) // original untouched
  })

  it('the seam allowance widens the pattern cut line', () => {
    const def = getGarment('top')
    const params = { ...DEFAULT_PARAMS, ...def.defaults }
    const narrow = garmentToPanels(def, { ...params, seam: 5 }, mann.measurements, mann.colliders)
    const wide = garmentToPanels(def, { ...params, seam: 20 }, mann.measurements, mann.colliders)
    expect(narrow.seam).toBe(5)
    expect(wide.seam).toBe(20)
  })

  it('notches off removes the pattern notch marks', () => {
    const def = getGarment('top')
    const params = { ...DEFAULT_PARAMS, ...def.defaults }
    const on = garmentToPanels(def, { ...params, notches: true }, mann.measurements, mann.colliders)
    const off = garmentToPanels(def, { ...params, notches: false }, mann.measurements, mann.colliders)
    expect(on.panels.some((p) => p.notches.length > 0)).toBe(true)
    expect(off.panels.every((p) => p.notches.length === 0)).toBe(true)
  })

  it('the manufacturing pack lists per-part fabric, trim + seam', () => {
    const def = getGarment('long-sleeve')
    const bundle: ManufactureBundle = {
      title: 'T',
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      layers: [
        {
          name: def.name,
          size: 'M',
          fabricName: 'Denim',
          gsm: 340,
          color: 0x3b5b82,
          parts: [{ part: 'sleeves', fabric: 'Leather' }],
          trim: 'Satin',
          seam: 12,
          metrics: garmentMetrics(def.name, 'M', def, gradeParams(defaultLayer('long-sleeve')), mann.measurements, mann.colliders),
          patternSVG: '<svg/>'
        }
      ]
    }
    const html = manufactureHTML(bundle)
    expect(html).toContain('Fabric (sleeves)')
    expect(html).toContain('Leather')
    expect(html).toContain('Trim')
    expect(html).toContain('12 mm')
    const json = JSON.parse(manufactureJSON(bundle))
    expect(json.garments[0].part_fabrics[0]).toEqual({ part: 'sleeves', fabric: 'Leather' })
    expect(json.garments[0].seam_allowance_mm).toBe(12)
  })
})

describe('per-part physics · per-piece solver params', () => {
  // Mirrors GarmentStack.pieceFabric: a part uses its override, else the body fabric.
  const pieceFabricId = (l: GarmentLayerData, name: string): string => {
    const part = partForPiece(name)
    return part === 'body' ? l.fabricId : (l.partFabrics?.[part]?.fabricId ?? l.fabricId)
  }

  it('partForPiece maps a piece mesh name to its part (case-insensitive)', () => {
    expect(partForPiece('Left sleeve')).toBe('sleeves')
    expect(partForPiece('Right sleeve')).toBe('sleeves')
    expect(partForPiece('Left leg')).toBe('legs')
    expect(partForPiece('Right leg')).toBe('legs')
    expect(partForPiece('Body')).toBe('body')
    expect(partForPiece('BODY')).toBe('body')
  })

  it('a part with no override falls back to the body fabric', () => {
    const l = defaultLayer('long-sleeve')
    l.fabricId = 'jersey-knit'
    expect(pieceFabricId(l, 'Right leg')).toBe('jersey-knit') // no legs override
    expect(pieceFabricId(l, 'Body')).toBe('jersey-knit')
  })

  it('a leather sleeve on a jersey body derives stiffer solver params for the sleeve', () => {
    const l = defaultLayer('long-sleeve')
    l.fabricId = 'jersey-knit'
    l.partFabrics = { sleeves: { fabricId: 'leather', color: 0x442200 } }

    const sleeve = fabricToSolverParams(getFabric(pieceFabricId(l, 'Left sleeve')))
    const body = fabricToSolverParams(getFabric(pieceFabricId(l, 'Body')))

    // leather drapes stiffer + heavier than jersey (the point of the feature)
    expect(sleeve.bendCompliance).toBeLessThan(body.bendCompliance)
    expect(sleeve.stretchCompliance).toBeLessThan(body.stretchCompliance)
    expect(sleeve.mass).toBeGreaterThan(body.mass)
  })

  it('a stiff sleeve-back panel derives stiffer drape than the (soft) sleeve front', () => {
    const l = defaultLayer('long-sleeve')
    l.fabricId = 'jersey-knit'
    l.partFabrics = { sleeveBack: { fabricId: 'leather', color: 0x442200 } }

    // Front sleeve = the sleeves/body fabric (jersey); back = the sleeveBack override (leather).
    const front = fabricToSolverParams(getFabric(pieceFabricId(l, 'Left sleeve')))
    const back = fabricToSolverParams(getFabric(panelFabricId(l, 'sleeveBack')))

    // The back panel drapes on its own, stiffer, params (mirrors body/leg per-panel physics).
    expect(back.bendCompliance).toBeLessThan(front.bendCompliance)
    expect(back.mass).toBeGreaterThan(front.mass)
  })
})

describe('per-panel fabric · front vs back', () => {
  it('back + legBack + sleeveBack panels round-trip through save/parse', () => {
    const c = defaultConfig()
    c.partFabrics = {
      back: { fabricId: 'leather', color: 0x222222 },
      legBack: { fabricId: 'denim', color: 0x3b5b82 },
      sleeveBack: { fabricId: 'leather', color: 0x442200 }
    }
    const l = parseDoc(serializeDoc(docFromConfig(c))).layers[0]
    expect(l.partFabrics?.back).toEqual({ fabricId: 'leather', color: 0x222222 })
    expect(l.partFabrics?.legBack).toEqual({ fabricId: 'denim', color: 0x3b5b82 })
    expect(l.partFabrics?.sleeveBack).toEqual({ fabricId: 'leather', color: 0x442200 })
  })

  it('cloneLayer deep-copies back + legBack + sleeveBack (duplicate is independent)', () => {
    const base = defaultLayer('long-sleeve')
    base.partFabrics = {
      back: { fabricId: 'leather', color: 0x111111 },
      legBack: { fabricId: 'denim', color: 0x222222 },
      sleeveBack: { fabricId: 'leather', color: 0x333333 }
    }
    const copy = cloneLayer(base)
    copy.partFabrics!.back!.color = 0x999999
    copy.partFabrics!.legBack!.color = 0x888888
    copy.partFabrics!.sleeveBack!.color = 0x777777
    expect(base.partFabrics!.back!.color).toBe(0x111111) // originals untouched
    expect(base.partFabrics!.legBack!.color).toBe(0x222222)
    expect(base.partFabrics!.sleeveBack!.color).toBe(0x333333)
  })

  it('panelFabricId follows the fallback chain (back→body, legBack→legs→body, sleeveBack→sleeves→body)', () => {
    const l = defaultLayer('long-sleeve')
    l.fabricId = 'jersey-knit'
    expect(panelFabricId(l, 'back')).toBe('jersey-knit') // no override → body
    expect(panelFabricId(l, 'legBack')).toBe('jersey-knit') // no legs → body
    expect(panelFabricId(l, 'sleeveBack')).toBe('jersey-knit') // no sleeves → body

    l.partFabrics = { legs: { fabricId: 'denim', color: 0 }, sleeves: { fabricId: 'leather', color: 0 } }
    expect(panelFabricId(l, 'legBack')).toBe('denim') // legBack falls back to legs
    expect(panelFabricId(l, 'sleeveBack')).toBe('leather') // sleeveBack falls back to sleeves

    l.partFabrics = {
      back: { fabricId: 'leather', color: 0 },
      legBack: { fabricId: 'denim', color: 0 },
      sleeveBack: { fabricId: 'jersey-knit', color: 0 }
    }
    expect(panelFabricId(l, 'back')).toBe('leather') // explicit overrides win
    expect(panelFabricId(l, 'legBack')).toBe('denim')
    expect(panelFabricId(l, 'sleeveBack')).toBe('jersey-knit')
  })
})
