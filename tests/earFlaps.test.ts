import { describe, it, expect } from 'vitest'
import {
  FLAP_HATS,
  FLAP_STYLES,
  FLAP_WORN,
  flapAngle,
  flapHalfWidth,
  flapStandoff,
  crownOf,
  FLAP_HINGE_FRAC,
  BILL_AZIMUTHS,
  FLAP_DOWN_RAD,
  FLAP_UP_RAD
} from '../src/renderer/avatar/earFlaps'
import { crownFit, crownRise, HAT_LINE_Y, HEAD_BREADTH_MM, mmToUnits } from '../src/renderer/avatar/brimless'
import { EAR_CENTRE_FRAC } from '../src/renderer/avatar/face'

describe('ear-flap hat blocks', () => {
  it('gives an ushanka the long flaps and a deerstalker the bills', () => {
    // an ushanka's flaps tie under the chin; a deerstalker's tie on top, and its
    // weather protection is the pair of bills, which is what makes it one
    expect(FLAP_HATS.ushanka.flapDropMm).toBeGreaterThan(FLAP_HATS.deerstalker.flapDropMm)
    expect(FLAP_HATS.ushanka.billMm).toBe(0)
    expect(FLAP_HATS.deerstalker.billMm).toBeGreaterThan(0)
    expect(BILL_AZIMUTHS).toHaveLength(2)
    // front and back, not at the sides
    expect(Math.abs(BILL_AZIMUTHS[0] - BILL_AZIMUTHS[1])).toBeCloseTo(Math.PI, 9)
  })

  it('gives fur more pile than tweed', () => {
    expect(FLAP_HATS.ushanka.pileMm).toBeGreaterThan(FLAP_HATS.deerstalker.pileMm)
    expect(FLAP_HATS.ushanka.liningMm).toBeGreaterThan(FLAP_HATS.deerstalker.liningMm)
  })

  it('blocks both shells well outside the head, because they are lined', () => {
    // drafted to the skull they clear by a millimetre or two and the head
    // interleaves with the hat from every angle
    for (const s of FLAP_STYLES) {
      const cs = crownOf(FLAP_HATS[s])
      expect(cs.bandMm, s).toBeGreaterThan(HEAD_BREADTH_MM + 12)
      expect(cs.fitted, s).toBe(true)
    }
  })

  it('grades the crown to clear the head in girth and in height', () => {
    for (const s of FLAP_STYLES) {
      const cs = crownOf(FLAP_HATS[s])
      expect(crownFit(cs), s).toBeGreaterThanOrEqual(1)
      expect(crownRise(cs, HAT_LINE_Y), s).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('flap hinge and worn state', () => {
  it('hinges on the ear, the same landmark the earrings use', () => {
    // if these two ever disagree, a flap and an earring are on different ears
    expect(FLAP_HINGE_FRAC).toBe(EAR_CENTRE_FRAC)
  })

  it('hangs a down flap just off vertical and folds an up one past horizontal', () => {
    expect(flapAngle('down')).toBe(FLAP_DOWN_RAD)
    expect(flapAngle('up')).toBe(FLAP_UP_RAD)
    expect(Math.abs(FLAP_DOWN_RAD)).toBeLessThan(0.4) // hanging, clear of the jaw
    expect(FLAP_UP_RAD).toBeGreaterThan(Math.PI / 2) // folded back onto the crown
    expect(FLAP_WORN).toEqual(['down', 'up'])
  })
})

describe('flap shape', () => {
  it('is widest over the ear and narrows to the tie', () => {
    // a rectangle reads as a mud guard
    expect(flapHalfWidth(0.35)).toBeGreaterThan(flapHalfWidth(0))
    expect(flapHalfWidth(1)).toBeLessThan(flapHalfWidth(0.35))
    expect(flapHalfWidth(1)).toBeGreaterThan(0) // the tie has width
  })

  it('never widens again after it has started narrowing', () => {
    let peak = 0
    let falling = false
    for (let t = 0; t <= 1; t += 0.01) {
      const w = flapHalfWidth(t)
      if (w < peak - 1e-9) falling = true
      if (falling) expect(w).toBeLessThanOrEqual(peak + 1e-9)
      peak = Math.max(peak, w)
    }
    expect(falling).toBe(true)
  })

  it('clamps outside 0…1', () => {
    expect(flapHalfWidth(-3)).toBeCloseTo(flapHalfWidth(0), 12)
    expect(flapHalfWidth(4)).toBeCloseTo(flapHalfWidth(1), 12)
  })

  it('stands further off the head toward the tip, and further on fur', () => {
    for (const s of FLAP_STYLES) {
      const h = FLAP_HATS[s]
      expect(flapStandoff(h, 1), s).toBeGreaterThan(flapStandoff(h, 0))
      expect(flapStandoff(h, 0), s).toBeCloseTo(h.pileMm * mmToUnits, 12)
    }
    expect(flapStandoff(FLAP_HATS.ushanka, 0.5)).toBeGreaterThan(flapStandoff(FLAP_HATS.deerstalker, 0.5))
  })
})
