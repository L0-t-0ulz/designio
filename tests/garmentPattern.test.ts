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
  placePrints,
  type Pt,
  type PatternPrintInput
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

  it('reflects yokes + princess seams in the pattern', () => {
    // sheath defaults to princess seams
    const sheath = garmentToPanels(getGarment('sheath'), paramsFor('sheath'), M, C)
    expect(sheath.princess).toBe(true)
    expect(sheath.detail).toContain('princess seams')
    expect(panelsToSVG(sheath)).toContain('#c0392b') // princess seam lines drawn on the panels
    // a yoke adds a Yoke piece + note
    const yoked = garmentToPanels(getGarment('long-sleeve'), { ...paramsFor('long-sleeve'), yoke: true }, M, C)
    expect(yoked.panels.some((p) => p.name === 'Yoke')).toBe(true)
    expect(yoked.detail).toContain('yoke')
    // neither on a plain skirt
    expect(garmentToPanels(getGarment('skirt'), paramsFor('skirt'), M, C).princess).toBeFalsy()
  })

  it('adds a hem-frill pattern piece per frill style', () => {
    const ruffle = garmentToPanels(getGarment('skirt'), { ...paramsFor('skirt'), ruffles: true, frillStyle: 'ruffle' }, M, C)
    expect(ruffle.panels.some((p) => p.name === 'Ruffle')).toBe(true)
    expect(ruffle.detail).toContain('ruffle frill')
    expect(garmentToPanels(getGarment('skirt'), { ...paramsFor('skirt'), ruffles: true, frillStyle: 'flounce' }, M, C).panels.some((p) => p.name === 'Flounce')).toBe(true)
    expect(garmentToPanels(getGarment('skirt'), { ...paramsFor('skirt'), ruffles: true, frillStyle: 'godet' }, M, C).panels.some((p) => p.name === 'Godet')).toBe(true)
    // a ruffle strip is fuller (longer) than a flounce strip
    const rw = (g: string) => { const p = garmentToPanels(getGarment('skirt'), { ...paramsFor('skirt'), ruffles: true, frillStyle: g as never }, M, C).panels.find((p) => /Ruffle|Flounce/.test(p.name))!; return p.wmm }
    expect(rw('ruffle')).toBeGreaterThan(rw('flounce'))
    expect(garmentToPanels(getGarment('skirt'), paramsFor('skirt'), M, C).panels.some((p) => /Ruffle|Flounce|Godet/.test(p.name))).toBe(false)
  })

  it('adds waistband / facing pieces + notes for waistbands, facings & drawstrings', () => {
    // wide-leg defaults to a waistband + drawstring
    const wl = garmentToPanels(getGarment('wide-leg'), paramsFor('wide-leg'), M, C)
    expect(wl.panels.some((p) => p.name === 'Waistband')).toBe(true)
    expect(wl.detail).toContain('waistband')
    expect(wl.detail).toContain('drawstring')
    // a facing adds a neck facing piece (garment with a neckline)
    const dress = garmentToPanels(getGarment('dress'), { ...paramsFor('dress'), facing: true }, M, C)
    expect(dress.panels.some((p) => p.name === 'Neck facing')).toBe(true)
    expect(dress.detail).toContain('facing')
    // none of these on a plain skirt
    const skirt = garmentToPanels(getGarment('skirt'), paramsFor('skirt'), M, C)
    expect(skirt.panels.some((p) => /Waistband|facing/.test(p.name))).toBe(false)
  })

  it('adds pocket pattern pieces per pocket style', () => {
    // cargo defaults to a bellows pocket → a cargo pocket + a flap piece
    const cargo = garmentToPanels(getGarment('cargo'), paramsFor('cargo'), M, C)
    const names = cargo.panels.map((p) => p.name)
    expect(names).toContain('Cargo pocket')
    expect(names).toContain('Pocket flap')
    expect(cargo.detail).toContain('bellows pocket')
    // style drives the piece(s)
    expect(panels('long-sleeve', { pocket: true, pocketStyle: 'welt' }).some((p) => p.name === 'Welt')).toBe(true)
    expect(panels('long-sleeve', { pocket: true, pocketStyle: 'jetted' }).some((p) => p.name === 'Jetted welt')).toBe(true)
    const flap = panels('long-sleeve', { pocket: true, pocketStyle: 'flap' }).map((p) => p.name)
    expect(flap).toContain('Pocket')
    expect(flap).toContain('Pocket flap')
    // no pocket → no pocket pieces
    expect(panels('long-sleeve', { pocket: false }).some((p) => /Pocket|Welt/.test(p.name))).toBe(false)
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

  const mkPrint = (over: Partial<PatternPrintInput> = {}): PatternPrintInput =>
    ({ part: 'body', kind: 'text', x: 0.25, y: 0.4, scale: 0.3, rotation: 0, text: 'LOGO', ...over })

  it('maps prints onto the right panel (body front/back · sleeve · leg)', () => {
    const top = panels('top') // Front, Back, Sleeve
    expect(placePrints(top, [mkPrint({ part: 'body', x: 0.25 })])[0].panel).toBe('Front')
    expect(placePrints(top, [mkPrint({ part: 'body', x: 0.75 })])[0].panel).toBe('Back')
    expect(placePrints(top, [mkPrint({ part: 'sleeves' })])[0].panel).toBe('Sleeve')
    const pants = panels('pants') // Leg front, Leg back
    expect(placePrints(pants, [mkPrint({ part: 'legs', x: 0.25 })])[0].panel).toBe('Leg front')
    expect(placePrints(pants, [mkPrint({ part: 'legs', x: 0.8 })])[0].panel).toBe('Leg back')
  })

  it('positions the print to scale within its panel (centre + footprint in mm)', () => {
    const top = panels('top')
    const front = top.find((p) => p.name === 'Front')!
    const [pp] = placePrints(top, [mkPrint({ part: 'body', x: 0.25, y: 0.5, scale: 0.4 })])
    expect(pp.cx).toBeCloseTo(front.wmm / 2, 1) // x=0.25 = front centre → mid-panel
    expect(pp.cy).toBeCloseTo(front.hmm / 2, 1) // y=0.5 → mid-height
    expect(pp.w).toBeGreaterThan(0)
    expect(pp.cx).toBeGreaterThanOrEqual(0)
    expect(pp.cx).toBeLessThanOrEqual(front.wmm)
    expect(pp.cy).toBeLessThanOrEqual(front.hmm)
  })

  it('drops empty text + prints targeting a piece the garment lacks', () => {
    const skirt = panels('skirt') // Front, Back — no sleeves/legs
    expect(placePrints(skirt, [mkPrint({ kind: 'text', text: '   ' })])).toHaveLength(0)
    expect(placePrints(skirt, [mkPrint({ part: 'sleeves' })])).toHaveLength(0)
    expect(placePrints(skirt, [mkPrint({ part: 'legs' })])).toHaveLength(0)
  })

  it('draws placed prints (text + note) onto the pattern SVG + a PRINT layer in DXF', () => {
    const res = garmentToPanels(getGarment('top'), paramsFor('top'), M, C, undefined, [
      mkPrint({ text: 'TEAM & CO' }),
      mkPrint({ part: 'sleeves', kind: 'image', imageName: 'crest.png' })
    ])
    const svg = panelsToSVG(res)
    expect(svg).toContain('TEAM &amp; CO') // text drawn (xml-escaped)
    expect(svg).toContain('crest.png') // image label drawn
    expect(svg).toContain('print placement') // legend note
    expect(panelsToDXF(res)).toContain('PRINT') // footprint on the PRINT layer
    // no prints → no print layer / note
    const plain = garmentToPanels(getGarment('top'), paramsFor('top'), M, C)
    expect(panelsToSVG(plain)).not.toContain('print placement')
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
