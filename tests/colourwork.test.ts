import { describe, it, expect } from 'vitest'
import {
  COLOURWORK_PRESETS,
  colourworkPreset,
  validateColourwork,
  colourworkIndex,
  colourworkKey,
  cloneColourwork,
  FAIRISLE_STITCHES,
  INTARSIA_CENTRE_U,
  INTARSIA_CENTRE_V,
  INTARSIA_WIDTH,
  type ColourworkChart
} from '../src/renderer/fabric/colourwork'
import { defaultLayer, cloneLayer, serializeDoc, parseDoc, captureColorway, applyColorway, docFromConfig } from '../src/renderer/studio/document'
import { hasArt } from '../src/renderer/start/design'
import { defaultConfig } from '../src/renderer/start/design'

const fairisle = (): ColourworkChart => cloneColourwork(colourworkPreset('fairisle')!.chart)
const heart = (): ColourworkChart => cloneColourwork(colourworkPreset('heart')!.chart)

describe('colourwork presets', () => {
  it('all validate; fair-isle presets use every yarn, intarsia presets keep ground cells', () => {
    for (const p of COLOURWORK_PRESETS) {
      expect(validateColourwork(p.chart), p.id).toBeNull()
      const used = new Set(p.chart.cells.flat())
      if (p.chart.mode === 'fairisle') {
        for (let y = 0; y < p.chart.palette.length; y++) expect(used.has(y), `${p.id} uses yarn ${y}`).toBe(true)
      } else {
        expect(used.has(0), `${p.id} has transparent ground`).toBe(true)
        expect(used.size).toBeGreaterThan(1)
      }
    }
  })

  it('registers the added colourwork (snowflake, reindeer, checkerboard, lightning-bolt)', () => {
    for (const id of ['snowflake', 'reindeer', 'checkerboard', 'lightning-bolt']) {
      const p = colourworkPreset(id)
      expect(p, `${id} should be registered`).toBeTruthy()
      expect(validateColourwork(p!.chart), id).toBeNull()
    }
    expect(colourworkPreset('snowflake')!.chart.mode).toBe('fairisle')
    expect(colourworkPreset('lightning-bolt')!.chart.mode).toBe('intarsia')
    expect(new Set(colourworkPreset('lightning-bolt')!.chart.cells.flat()).has(0)).toBe(true) // transparent ground
  })

  it('the heart motif is horizontally symmetric', () => {
    const c = heart()
    for (const row of c.cells) expect(row).toEqual([...row].reverse())
  })

  it('the skull jacquard is symmetric with hollow eye sockets', () => {
    const c = colourworkPreset('skull')!.chart
    for (const row of c.cells) expect(row).toEqual([...row].reverse())
    // the eye-socket rows read ground through the sockets
    const eyeRows = c.cells.filter((r) => r.join('').includes('110011'))
    expect(eyeRows.length).toBeGreaterThanOrEqual(2)
  })
})

describe('validateColourwork', () => {
  it('rejects malformed charts', () => {
    const c = fairisle()
    expect(validateColourwork({ ...c, mode: 'x' as ColourworkChart['mode'] })).toMatch(/mode/)
    expect(validateColourwork({ ...c, palette: [0xffffff] })).toMatch(/palette/)
    expect(validateColourwork({ ...c, cells: [] })).toMatch(/rows/)
    expect(validateColourwork({ ...c, cells: [[0], [0, 1]] })).toMatch(/same width/)
    expect(validateColourwork({ ...c, cells: [[0, 9]] })).toMatch(/missing yarn/)
  })
})

describe('colourworkIndex', () => {
  it('fair-isle tiles the whole canvas — every sample maps to a real yarn', () => {
    const c = fairisle()
    for (let i = 0; i < 300; i++) {
      const idx = colourworkIndex(c, (i * 0.617) % 1, (i * 0.371) % 1)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(c.palette.length)
    }
  })

  it('fair-isle repeats with the stitch grid', () => {
    const c = fairisle()
    const w = c.cells[0].length
    const period = w / FAIRISLE_STITCHES // the chart repeats every w stitch cells
    for (let i = 0; i < 50; i++) {
      const u = (i * 0.113) % (1 - period)
      const v = (i * 0.271) % 1
      expect(colourworkIndex(c, u + period, v)).toBe(colourworkIndex(c, u, v))
    }
  })

  it('intarsia is a bounded block: transparent outside, ground cells transparent inside', () => {
    const c = heart()
    // far corners — outside the block
    expect(colourworkIndex(c, 0.02, 0.02)).toBe(-1)
    expect(colourworkIndex(c, 0.9, 0.9)).toBe(-1)
    // the block centre row hits the heart body (yarn 1)
    expect(colourworkIndex(c, INTARSIA_CENTRE_U, INTARSIA_CENTRE_V)).toBe(1)
    // just inside the block's top-left corner the heart's lobes leave ground → -1
    const w = c.cells[0].length
    const h = c.cells.length
    const cell = INTARSIA_WIDTH / w
    const left = INTARSIA_CENTRE_U - INTARSIA_WIDTH / 2
    const top = INTARSIA_CENTRE_V - (h * cell) / 2
    expect(colourworkIndex(c, left + cell * 0.5, top + cell * 0.5)).toBe(-1)
  })

  it('columns are mirrored so charts read as authored on the garment', () => {
    // an asymmetric one-row chart: yarn 1 only in the first authored column
    const c: ColourworkChart = { mode: 'intarsia', palette: [0, 0xff0000], cells: [[1, 0, 0, 0]] }
    expect(validateColourwork(c)).toBeNull()
    const w = 4
    const cell = INTARSIA_WIDTH / w
    const left = INTARSIA_CENTRE_U - INTARSIA_WIDTH / 2
    // the canvas is sampled mirrored → the authored-left cell paints at the block's RIGHT
    expect(colourworkIndex(c, left + cell * (w - 0.5), INTARSIA_CENTRE_V)).toBe(1)
    expect(colourworkIndex(c, left + cell * 0.5, INTARSIA_CENTRE_V)).toBe(-1)
  })
})

describe('identity + cloning + persistence', () => {
  it('colourworkKey tracks structure, palette and mode', () => {
    const a = fairisle()
    const b = cloneColourwork(a)
    expect(colourworkKey(b)).toBe(colourworkKey(a))
    b.cells[0][0] = 1
    expect(colourworkKey(b)).not.toBe(colourworkKey(a))
    const c = cloneColourwork(a)
    c.palette[1] = 0x123456
    expect(colourworkKey(c)).not.toBe(colourworkKey(a))
  })

  it('cloneColourwork is deep', () => {
    const a = heart()
    const b = cloneColourwork(a)
    b.cells[0][0] = 1
    b.palette[0] = 0x111111
    expect(colourworkKey(a)).toBe(colourworkKey(heart()))
  })

  it('counts as art (a colourwork alone builds an albedo)', () => {
    expect(hasArt({ prints: [], colourwork: fairisle() })).toBe(true)
    expect(hasArt({ prints: [] })).toBe(false)
  })

  it('survives a .dio round trip; colorways capture + reapply it deeply', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].colourwork = fairisle()
    const back = parseDoc(serializeDoc(doc))
    expect(colourworkKey(back.layers[0].colourwork!)).toBe(colourworkKey(fairisle()))

    const l = defaultLayer()
    l.colourwork = heart()
    const copy = cloneLayer(l)
    copy.colourwork!.cells[0][0] = 1
    expect(colourworkKey(l.colourwork!)).toBe(colourworkKey(heart()))

    const cw = captureColorway(l, 'heart way')
    const other = defaultLayer()
    applyColorway(other, cw)
    expect(colourworkKey(other.colourwork!)).toBe(colourworkKey(l.colourwork!))
    other.colourwork!.palette[1] = 0x00ff00
    expect(colourworkKey(l.colourwork!)).toBe(colourworkKey(heart()))
  })
})
