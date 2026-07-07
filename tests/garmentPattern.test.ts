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

  it('adds a collar/lapel pattern piece per collar style', () => {
    // blazer defaults to a notch lapel → a "Lapel" piece + a styled note
    const blazer = garmentToPanels(getGarment('blazer'), paramsFor('blazer'), M, C)
    expect(blazer.panels.some((p) => p.name === 'Lapel')).toBe(true)
    expect(blazer.detail).toContain('notch collar')
    // style drives the piece name
    expect(panels('long-sleeve', { collar: true, collarStyle: 'shirt' }).some((p) => p.name === 'Collar + stand')).toBe(true)
    expect(panels('long-sleeve', { collar: true, collarStyle: 'peterpan' }).some((p) => p.name === 'Collar (flat)')).toBe(true)
    expect(panels('long-sleeve', { collar: true, collarStyle: 'band' }).some((p) => p.name === 'Collar')).toBe(true)
    // no collar → no collar piece
    expect(panels('long-sleeve', { collar: false }).some((p) => /Collar|Lapel/.test(p.name))).toBe(false)
  })

  it('draws a centre-front closure on the pattern (button placket vs zip)', () => {
    const blazer = garmentToPanels(getGarment('blazer'), paramsFor('blazer'), M, C)
    expect(blazer.closure).toBe('button')
    const svg = panelsToSVG(blazer)
    expect(svg).toContain('#6b5bd6') // purple CF closure stroke
    expect(svg).toContain('button closure') // legend detail note
    expect(svg).toContain('<circle') // buttons drawn as circles

    const hoodie = garmentToPanels(getGarment('hoodie'), paramsFor('hoodie'), M, C)
    expect(hoodie.closure).toBe('zip')
    expect(panelsToSVG(hoodie)).toContain('zip closure')

    // no closure → no placket / note
    const skirt = garmentToPanels(getGarment('skirt'), paramsFor('skirt'), M, C)
    expect(skirt.closure).toBeUndefined()
    expect(panelsToSVG(skirt)).not.toContain('#6b5bd6')
  })

  it('annotates a topstitch guide line inset inside the sew line', () => {
    const res = garmentToPanels(getGarment('dress'), paramsFor('dress'), M, C)
    const svg = panelsToSVG(res)
    expect(svg).toContain('#b8863b') // gold topstitch stroke
    expect(svg).toContain('topstitch') // legend note
    // the topstitch inset sits inside the sew line, which sits inside the cut line
    const front = res.panels[0]
    const sewW = width(front.outline)
    const stitchW = width(offsetPolygon(front.outline, -6))
    const cutW = width(offsetPolygon(front.outline, res.seam))
    expect(stitchW).toBeLessThan(sewW)
    expect(sewW).toBeLessThan(cutW)
  })
})
