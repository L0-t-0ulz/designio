import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc, gradeParams } from '../src/renderer/studio/document'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'
import { garmentMetrics } from '../src/renderer/export/garmentMetrics'
import { manufactureHTML, manufactureJSON, type ManufactureBundle } from '../src/renderer/export/manufacture'

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
