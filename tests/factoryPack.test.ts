import { describe, it, expect } from 'vitest'
import { FACTORY_PACK_SCHEMA, FACTORY_PACK_VERSION, factoryPackJSON } from '../src/renderer/export/factoryPack'
import { supplierFor } from '../src/renderer/export/suppliers'
import { getFabric, FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'
import { panelsToDXF, garmentToPanels } from '../src/renderer/export/garmentPattern'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import type { ManufactureBundle } from '../src/renderer/export/manufacture'

describe('factory pack + sourceable BOM', () => {
  it('every library fabric has a supplier estimate with a sane lead window', () => {
    for (const f of FABRIC_LIBRARY) {
      const sup = supplierFor(f)
      expect(sup.source.length).toBeGreaterThan(10)
      expect(sup.leadWeeksMin).toBeGreaterThanOrEqual(4)
      expect(sup.leadWeeksMax).toBeGreaterThan(sup.leadWeeksMin)
    }
    expect(supplierFor(getFabric('denim')).source).toContain('Cotton')
    expect(supplierFor(getFabric('leather')).source).toContain('Tanneries')
  })

  it('emits a versioned, parse-backable schema with explicit units and the sourceable BOM', () => {
    const bundle: ManufactureBundle = {
      title: 'SS26 look 4',
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      layers: [
        {
          name: 'Dress',
          size: 'M',
          fabricName: 'Denim',
          gsm: 400,
          color: 0x334455,
          metrics: { rows: [{ label: 'Chest', cm: 94 }], fabricM2: 1.4, seamCm: 300, ease: [] } as never,
          supplier: { source: 'Cotton mills — Tiruppur (IN)', leadWeeksMin: 4, leadWeeksMax: 6 },
          trim: 'Leather',
          patternSVG: '<svg/>',
          patternDxfAama: '0\nSECTION'
        }
      ]
    }
    const doc = JSON.parse(factoryPackJSON(bundle)) as Record<string, never>
    expect(doc['schema']).toBe(FACTORY_PACK_SCHEMA)
    expect(doc['version']).toBe(FACTORY_PACK_VERSION)
    const g = (doc['garments'] as unknown as Array<Record<string, unknown>>)[0]
    expect(g.style).toBe('Dress')
    const bom = g.bom as Array<Record<string, unknown>>
    expect(bom[0].supplier).toContain('Tiruppur')
    expect(bom[0].leadWeeksMax).toBe(6)
    expect(bom.some((r) => r.role === 'trim')).toBe(true)
    expect((g.measurementsCm as Array<Record<string, unknown>>)[0]).toEqual({ point: 'Chest', cm: 94 })
    expect(g.patternDxfAama).toContain('SECTION')
  })

  it('DXF-AAMA layers: boundary on layer 1, internals on 8; the classic export unchanged', () => {
    const mann = buildMannequin()
    const res = garmentToPanels(getGarment('dress'), gradeParams(defaultLayer('dress')), mann.measurements, mann.colliders)
    const aama = panelsToDXF(res, { aama: true })
    expect(aama).toContain('LWPOLYLINE\n8\n1\n') // boundary layer 1
    expect(aama).toContain('LWPOLYLINE\n8\n8\n') // internal (sew) layer 8
    expect(aama).not.toContain('\nCUT\n')
    const classic = panelsToDXF(res)
    expect(classic).toContain('\nCUT\n')
    expect(classic).toContain('\nSEW\n')
  })
})
