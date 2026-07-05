import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment, GARMENT_IDS } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import {
  garmentToPanels,
  panelsToSVG,
  panelsToDXF,
  offsetPolygon,
  type Pt
} from '../src/renderer/export/garmentPattern'

const mann = buildMannequin()
const M = mann.measurements
const C = mann.colliders

const paramsFor = (id: GarmentType): GarmentParams => ({ ...DEFAULT_PARAMS, ...getGarment(id).defaults })
const panels = (id: GarmentType, over: Partial<GarmentParams> = {}) =>
  garmentToPanels(getGarment(id), { ...paramsFor(id), ...over }, M, C).panels
const width = (pts: Pt[]): number => Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x))

describe('real per-garment 2D pattern', () => {
  it('unwraps the right pieces per garment', () => {
    expect(panels('tube-top').map((p) => p.name)).toEqual(['Front', 'Back']) // strapless, no sleeve
    expect(panels('top').map((p) => p.name)).toEqual(['Front', 'Back', 'Sleeve']) // + short sleeve
    expect(panels('skirt').map((p) => p.name)).toEqual(['Front', 'Back'])
    expect(panels('pants').map((p) => p.name)).toEqual(['Leg front', 'Leg back'])
    expect(panels('jumpsuit').length).toBeGreaterThanOrEqual(4) // body + legs
  })

  it('front panel width ≈ garment half-circumference (π·radius)', () => {
    const spec = garmentTubeSpecs(getGarment('top'), paramsFor('top'), M)[0]
    const maxR = Math.max(spec.radiusTop, spec.radiusBottom, spec.radiusWaist ?? 0)
    const front = panels('top')[0]
    const expected = Math.PI * maxR * 1000
    expect(Math.abs(front.wmm - expected) / expected).toBeLessThan(0.05)
  })

  it('the neckline dips at the front but a strapless top has a flat top edge', () => {
    const NCOL = 26 // top-edge samples (must match the generator)
    const scoop = panels('top')[0].outline.slice(0, NCOL + 1)
    const dip = scoop[NCOL / 2].y - scoop[0].y // centre lower (larger y, y-down) than the shoulder
    expect(dip).toBeGreaterThan(5)

    const flat = panels('tube-top')[0].outline.slice(0, NCOL + 1)
    const flatDip = Math.max(...flat.map((p) => p.y)) - Math.min(...flat.map((p) => p.y))
    expect(flatDip).toBeLessThan(2)
  })

  it('more flare widens the hem', () => {
    const narrow = width(panels('skirt', { flare: 0 })[0].outline)
    const wide = width(panels('skirt', { flare: 0.2 })[0].outline)
    expect(wide).toBeGreaterThan(narrow + 20)
  })

  it('the cut line sits a seam allowance outside the sew line', () => {
    const sew = panels('top')[0].outline
    const cut = offsetPolygon(sew, 10)
    expect(width(cut)).toBeGreaterThan(width(sew) + 15) // grew ~2·SA
  })

  it('every catalog garment yields valid panels', () => {
    for (const id of GARMENT_IDS) {
      const ps = panels(id)
      expect(ps.length).toBeGreaterThanOrEqual(2)
      for (const p of ps) {
        expect(p.wmm).toBeGreaterThan(0)
        expect(p.hmm).toBeGreaterThan(0)
        expect(p.outline.length).toBeGreaterThan(3)
        expect(p.cut).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('renders SVG + DXF with sew/cut layers', () => {
    const res = garmentToPanels(getGarment('dress'), paramsFor('dress'), M, C)
    const svg = panelsToSVG(res)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Front')
    expect(svg).toContain('grainline')
    const dxf = panelsToDXF(res)
    expect(dxf).toContain('LWPOLYLINE')
    expect(dxf).toContain('SEW')
    expect(dxf).toContain('CUT')
  })
})
