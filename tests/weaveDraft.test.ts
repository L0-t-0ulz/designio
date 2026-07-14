import { describe, it, expect } from 'vitest'
import {
  DRAFT_PRESETS,
  draftPreset,
  validateDraft,
  drawdown,
  draftHeight,
  draftRoughness,
  draftNormal,
  cloneDraft,
  draftKey,
  type WeaveDraft
} from '../src/renderer/fabric/weaveDraft'
import { defaultLayer, cloneLayer, serializeDoc, parseDoc, captureColorway, applyColorway, docFromConfig } from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

const plain = (): WeaveDraft => cloneDraft(draftPreset('plain')!.draft)
const satin = (): WeaveDraft => cloneDraft(draftPreset('satin')!.draft)
const twill = (): WeaveDraft => cloneDraft(draftPreset('twill')!.draft)

describe('weave draft presets', () => {
  it('all validate and produce a non-degenerate drawdown', () => {
    for (const p of DRAFT_PRESETS) {
      expect(validateDraft(p.draft), p.id).toBeNull()
      const dd = drawdown(p.draft)
      const cells = dd.up.flat()
      expect(cells.some((c) => c), p.id).toBe(true)
      expect(cells.some((c) => !c), p.id).toBe(true)
    }
  })

  it('plain weave is the over-under checkerboard', () => {
    const dd = drawdown(plain())
    expect(dd.ends).toBe(2)
    expect(dd.picks).toBe(2)
    expect(dd.up).toEqual([
      [true, false],
      [false, true]
    ])
  })

  it('2/2 twill lifts two of four each pick, stepping one end per pick', () => {
    const dd = drawdown(twill())
    for (let p = 0; p < dd.picks; p++) {
      expect(dd.up[p].filter(Boolean).length).toBe(2)
      const next = dd.up[(p + 1) % dd.picks]
      // the next pick's lift pattern is this pick's, shifted one end (a diagonal)
      expect(next).toEqual(dd.up[p].map((_, e) => dd.up[p][(e - 1 + dd.ends) % dd.ends]))
    }
  })

  it('3/1 denim is warp-faced (75% warp coverage)', () => {
    const dd = drawdown(draftPreset('denim')!.draft)
    const cover = dd.up.flat().filter(Boolean).length / (dd.ends * dd.picks)
    expect(cover).toBeCloseTo(0.75, 5)
  })

  it('5-end satin binds each end exactly once per repeat, with warp floats of 4', () => {
    const dd = drawdown(satin())
    for (let e = 0; e < dd.ends; e++) {
      const downs = dd.up.map((row) => row[e]).filter((up) => !up).length
      expect(downs).toBe(1)
    }
    for (let p = 0; p < dd.picks; p++) {
      for (let ei = 0; ei < dd.ends; ei++) {
        if (dd.up[p][ei]) expect(dd.warpFloat[p][ei]).toBe(4)
      }
    }
  })

  it('herringbone reverses its diagonal at the point (a chevron, not a straight twill)', () => {
    const dd = drawdown(draftPreset('herringbone')!.draft)
    // a straight twill's rows are pure rotations of each other across the FULL width;
    // point threading breaks that
    const rotated = dd.up[0].map((_, e) => dd.up[0][(e - 1 + dd.ends) % dd.ends])
    expect(dd.up[1]).not.toEqual(rotated)
  })

  it('plain weave floats are all length 1', () => {
    const dd = drawdown(plain())
    expect(dd.warpFloat.flat().every((f) => f === 1)).toBe(true)
    expect(dd.weftFloat.flat().every((f) => f === 1)).toBe(true)
  })
})

describe('validateDraft', () => {
  it('accepts a good draft and rejects structural problems', () => {
    const d = plain()
    expect(validateDraft(d)).toBeNull()
    expect(validateDraft({ ...d, threading: [0, 5] })).toMatch(/missing shaft/)
    expect(validateDraft({ ...d, treadling: [0, 9] })).toMatch(/missing treadle/)
    expect(validateDraft({ ...d, tieUp: [[true]] })).toMatch(/treadles × shafts/)
    expect(validateDraft({ ...d, shafts: 1 })).toMatch(/shafts/)
    expect(validateDraft({ ...d, threading: [] })).toMatch(/threading/)
  })

  it('rejects an unbound pick (a used treadle lifting no shaft, or every shaft)', () => {
    const none = plain()
    none.tieUp[0] = [false, false]
    expect(validateDraft(none)).toMatch(/lifts no shaft/)
    const all = plain()
    all.tieUp[1] = [true, true]
    expect(validateDraft(all)).toMatch(/lifts every shaft/)
    // an unused treadle may be empty — only the treadling's treadles must bind
    const unused = plain()
    unused.treadles = 3
    unused.tieUp = [...unused.tieUp.map((r) => [...r]), [false, false]]
    expect(validateDraft(unused)).toBeNull()
  })
})

describe('draft height / roughness / normal fields', () => {
  it('height stays in [0, 1] and the field tiles seamlessly', () => {
    for (const p of DRAFT_PRESETS) {
      const dd = drawdown(p.draft)
      // whole drawdown repeats per tile (the bake's convention) — else it can't tile
      const tU = dd.ends * Math.max(1, Math.round(16 / dd.ends))
      const tV = dd.picks * Math.max(1, Math.round(16 / dd.picks))
      for (let i = 0; i < 200; i++) {
        const u = (i * 0.617) % 1
        const v = (i * 0.371) % 1
        const h = draftHeight(dd, u, v, tU, tV)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(1)
        expect(draftHeight(dd, u + 1, v, tU, tV)).toBeCloseTo(h, 10)
        expect(draftHeight(dd, u, v - 1, tU, tV)).toBeCloseTo(h, 10)
      }
    }
  })

  it('long satin floats sit higher and flatter than plain interlacements', () => {
    const pd = drawdown(plain())
    const sd = drawdown(satin())
    // sample the height at warp-cell edges (tu = 0): plain drops to the valley,
    // a satin float stays up on its plateau
    const plainEdge = draftHeight(pd, 0, 0.25, 2, 2) // warp-up cell, edge of the thread
    const satinCell = sd.up.findIndex((row) => row[0]) // a pick where end 0 floats
    const satinEdge = draftHeight(sd, 0, (satinCell + 0.5) / 5, 5, 5)
    expect(satinEdge).toBeGreaterThan(plainEdge + 0.5)
  })

  it('roughness is the inverted height in (0, 1] — crowns glossier than valleys', () => {
    const dd = drawdown(twill())
    let crown = 1
    let valley = 0
    for (let i = 0; i < 100; i++) {
      const r = draftRoughness(dd, (i * 0.13) % 1, (i * 0.29) % 1, 16, 16)
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(1)
      crown = Math.min(crown, r)
      valley = Math.max(valley, r)
    }
    expect(crown).toBeLessThan(valley)
  })

  it('normals are unit length and average to +z (a flat sheet overall)', () => {
    const dd = drawdown(draftPreset('herringbone')!.draft)
    let sx = 0
    let sy = 0
    let sz = 0
    const N = 400
    for (let i = 0; i < N; i++) {
      const [nx, ny, nz] = draftNormal(dd, (i * 0.037) % 1, (i * 0.053) % 1, 24, 16, 3)
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 6)
      sx += nx
      sy += ny
      sz += nz
    }
    expect(Math.abs(sx / N)).toBeLessThan(0.15)
    expect(Math.abs(sy / N)).toBeLessThan(0.15)
    expect(sz / N).toBeGreaterThan(0.7)
  })
})

describe('draft identity + cloning', () => {
  it('draftKey is stable across clones and changes when the tie-up changes', () => {
    const a = twill()
    const b = cloneDraft(a)
    expect(draftKey(b)).toBe(draftKey(a))
    b.tieUp[0][2] = !b.tieUp[0][2]
    expect(draftKey(b)).not.toBe(draftKey(a))
  })

  it('cloneDraft is deep — mutating the clone leaves the original alone', () => {
    const a = twill()
    const b = cloneDraft(a)
    b.threading[0] = 3
    b.tieUp[1][1] = !b.tieUp[1][1]
    b.treadling.push(0)
    expect(a.threading[0]).toBe(0)
    expect(draftKey(a)).toBe(draftKey(twill()))
  })
})

describe('weave draft persistence', () => {
  it('survives a .dio serialize → parse round trip', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].weaveDraft = draftPreset('herringbone')!.draft
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].weaveDraft).toBeDefined()
    expect(draftKey(back.layers[0].weaveDraft!)).toBe(draftKey(draftPreset('herringbone')!.draft))
  })

  it('cloneLayer deep-copies the draft; colorways capture + reapply it', () => {
    const l = defaultLayer()
    l.weaveDraft = cloneDraft(draftPreset('twill')!.draft)
    const copy = cloneLayer(l)
    copy.weaveDraft!.tieUp[0][0] = !copy.weaveDraft!.tieUp[0][0]
    expect(draftKey(l.weaveDraft!)).toBe(draftKey(draftPreset('twill')!.draft))

    const cw = captureColorway(l, 'twill way')
    const other = defaultLayer()
    applyColorway(other, cw)
    expect(other.weaveDraft).toBeDefined()
    expect(draftKey(other.weaveDraft!)).toBe(draftKey(l.weaveDraft!))
    // the colorway must not share the layer's draft object
    other.weaveDraft!.threading[0] = 1
    expect(l.weaveDraft!.threading[0]).toBe(0)
  })
})
