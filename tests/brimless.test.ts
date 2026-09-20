import { describe, it, expect } from 'vitest'
import {
  CROWNS,
  BRIMLESS_STYLES,
  HEAD_BREADTH_MM,
  mmToUnits,
  crownRadius,
  crownHeight,
  tasselStrand,
  TASSEL_STRANDS,
  TASSEL_LENGTH_MM,
  TASSEL_OVER_EDGE,
  TASSEL_AZIMUTH
} from '../src/renderer/avatar/brimless'
import { HEAD_UNITS_ACROSS } from '../src/renderer/avatar/shades'

describe('brimless crown blocks', () => {
  it('blocks each hat to a height a milliner would recognise', () => {
    expect(CROWNS.fez.heightMm).toBeGreaterThan(CROWNS.kufi.heightMm) // a fez is the tall one
    expect(CROWNS.pillbox.heightMm).toBeLessThan(CROWNS.fez.heightMm)
    for (const s of BRIMLESS_STYLES) {
      expect(CROWNS[s].heightMm, s).toBeGreaterThan(40)
      expect(CROWNS[s].heightMm, s).toBeLessThan(140)
    }
  })

  it('makes the pillbox narrower than the head, which is why it perches', () => {
    expect(CROWNS.pillbox.bandMm).toBeLessThan(HEAD_BREADTH_MM)
    // and so it is worn tilted and set back, unlike the two that fit
    expect(CROWNS.pillbox.tiltDeg).toBeGreaterThan(0)
    expect(CROWNS.pillbox.setBack).toBeGreaterThan(CROWNS.fez.setBack)
    expect(CROWNS.kufi.tiltDeg).toBe(0)
  })

  it('tapers the fez and keeps the pillbox straight-sided', () => {
    expect(CROWNS.fez.topMm).toBeLessThan(CROWNS.fez.bandMm) // a truncated cone
    expect(CROWNS.pillbox.topMm).toBe(CROWNS.pillbox.bandMm) // a drum
  })

  it('converts millimetres through the measured head breadth', () => {
    expect(mmToUnits * HEAD_BREADTH_MM).toBeCloseTo(HEAD_UNITS_ACROSS, 9)
  })
})

describe('crownRadius', () => {
  it('starts at the band and, on a hard-edged block, ends at the top diameter', () => {
    const p = CROWNS.pillbox
    expect(crownRadius(p, 0)).toBeCloseTo((p.bandMm / 2) * mmToUnits, 9)
    // straight-sided right up to where the lip rolls
    expect(crownRadius(p, 1 - p.roundTop)).toBeCloseTo((p.topMm / 2) * mmToUnits, 9)
  })

  it('narrows monotonically on a tapering block', () => {
    let prev = Infinity
    for (let t = 0; t <= 1; t += 0.02) {
      const r = crownRadius(CROWNS.fez, t)
      expect(r).toBeLessThanOrEqual(prev + 1e-12)
      prev = r
    }
  })

  it('rolls a kufi over from a quarter up and a pillbox only at its lip', () => {
    // both close at the apex — that is what a rolled edge does. What separates
    // them is how far DOWN the roll starts, so compare them below the apex.
    const kufiHigh = crownRadius(CROWNS.kufi, 0.8) / crownRadius(CROWNS.kufi, 0.2)
    const drumHigh = crownRadius(CROWNS.pillbox, 0.8) / crownRadius(CROWNS.pillbox, 0.2)
    expect(kufiHigh).toBeLessThan(0.8) // already well into the dome
    expect(drumHigh).toBeGreaterThan(0.99) // still full diameter, flat topped
    expect(crownRadius(CROWNS.kufi, 1)).toBeCloseTo(0, 9)
    expect(crownRadius(CROWNS.pillbox, 1)).toBeCloseTo(0, 9)
    expect(CROWNS.kufi.roundTop).toBeGreaterThan(CROWNS.pillbox.roundTop)
  })

  it('never goes negative or NaN anywhere on any block', () => {
    for (const s of BRIMLESS_STYLES) {
      for (let t = -0.5; t <= 1.5; t += 0.01) {
        const r = crownRadius(CROWNS[s], t)
        expect(Number.isFinite(r), `${s} @ ${t}`).toBe(true)
        expect(r, `${s} @ ${t}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('reports a height that scales with the block', () => {
    expect(crownHeight(CROWNS.fez)).toBeCloseTo(CROWNS.fez.heightMm * mmToUnits, 12)
    expect(crownHeight(CROWNS.fez)).toBeGreaterThan(crownHeight(CROWNS.pillbox))
  })
})

describe('fez tassel', () => {
  const RIM = 0.8 // a typical fez rim radius in head-frame units

  it('runs out to the rim before it falls, instead of through the crown', () => {
    // the bug this covers: strands dropped straight from the button pass through
    // the hat and the head
    for (let i = 0; i < TASSEL_STRANDS; i++) {
      const start = tasselStrand(i, TASSEL_STRANDS, 0, 0, RIM)
      const edge = tasselStrand(i, TASSEL_STRANDS, TASSEL_OVER_EDGE, 0, RIM)
      expect(start.y).toBeCloseTo(0, 12) // on the button, on the flat top
      expect(edge.y).toBeCloseTo(0, 12) // still on the top when it reaches the rim
      expect(Math.hypot(edge.x, edge.z)).toBeCloseTo(RIM, 1) // at the rim, ± the bundle
      expect(Math.hypot(start.x, start.z)).toBeLessThan(RIM * 0.2)
    }
  })

  it('falls only once it is over the edge, to its full length', () => {
    const end = tasselStrand(0, TASSEL_STRANDS, 1, 0, RIM)
    expect(end.y).toBeCloseTo(-TASSEL_LENGTH_MM * mmToUnits, 9)
    expect(Math.hypot(end.x, end.z)).toBeGreaterThan(RIM) // hanging outside the crown
    for (let d = 0; d <= TASSEL_OVER_EDGE; d += 0.02) {
      expect(tasselStrand(0, TASSEL_STRANDS, d, 0, RIM).y).toBeCloseTo(0, 9)
    }
  })

  it('descends monotonically once it has left the edge', () => {
    let prev = 0
    for (let d = 0; d <= 1; d += 0.01) {
      const y = tasselStrand(0, TASSEL_STRANDS, d, 0, RIM).y
      expect(y).toBeLessThanOrEqual(prev + 1e-12)
      prev = y
    }
  })

  it('hangs as ONE bundle off one side, not as a fringe all the way round', () => {
    const ends = Array.from({ length: TASSEL_STRANDS }, (_, i) => tasselStrand(i, TASSEL_STRANDS, 1, 0, RIM))
    const cx = ends.reduce((a, p) => a + p.x, 0) / ends.length
    const cz = ends.reduce((a, p) => a + p.z, 0) / ends.length
    // the bundle's centre is out at the rim…
    expect(Math.hypot(cx, cz)).toBeCloseTo(RIM, 1)
    // …and every strand is within a bundle's width of it, not spread round the hat
    for (const p of ends) expect(Math.hypot(p.x - cx, p.z - cz)).toBeLessThan(RIM * 0.25)
  })

  it('spaces the strands evenly round the bundle', () => {
    const cx = Math.cos(TASSEL_AZIMUTH) * RIM
    const cz = Math.sin(TASSEL_AZIMUTH) * RIM
    const angles = Array.from({ length: TASSEL_STRANDS }, (_, i) => {
      const p = tasselStrand(i, TASSEL_STRANDS, 0.5, 0, RIM)
      return Math.atan2(p.z - cz, p.x - cx)
    })
    const step = (2 * Math.PI) / TASSEL_STRANDS
    for (let i = 1; i < angles.length; i++) {
      let d = angles[i] - angles[i - 1]
      while (d < 0) d += 2 * Math.PI
      expect(d).toBeCloseTo(step, 6)
    }
  })

  it('swings the hanging part and leaves the part on the hat where it is', () => {
    const still = tasselStrand(3, TASSEL_STRANDS, 1, 0, RIM)
    const swung = tasselStrand(3, TASSEL_STRANDS, 1, 0.4, RIM)
    expect(swung.x - still.x).toBeCloseTo(0.4, 9)
    // nothing on the flat top moves: a tassel swings from where it leaves the rim
    expect(tasselStrand(3, TASSEL_STRANDS, 0.1, 0.4, RIM).x).toBeCloseTo(tasselStrand(3, TASSEL_STRANDS, 0.1, 0, RIM).x, 9)
  })

  it('clamps outside 0…1', () => {
    expect(tasselStrand(0, TASSEL_STRANDS, -2, 0, RIM).y).toBeCloseTo(0, 12)
    expect(tasselStrand(0, TASSEL_STRANDS, 5, 0, RIM).y).toBeCloseTo(tasselStrand(0, TASSEL_STRANDS, 1, 0, RIM).y, 12)
  })
})
