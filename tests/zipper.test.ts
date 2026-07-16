import { describe, it, expect } from 'vitest'
import { zipTeethMm, zipGaugeForWeight, zipLengthForCategory, zipperSpecFor, zipSliderCount, zipperSummary } from '../src/renderer/garment/zipper'

describe('zipper builder', () => {
  it('teeth width tracks the gauge number', () => {
    expect(zipTeethMm('3')).toBe(3)
    expect(zipTeethMm('10')).toBe(10)
  })

  it('picks a chunkier gauge for heavier cloth', () => {
    expect(zipGaugeForWeight(90)).toBe('3') // a light dress
    expect(zipGaugeForWeight(180)).toBe('5') // a shirt / light jacket
    expect(zipGaugeForWeight(320)).toBe('8') // a coat
    expect(zipGaugeForWeight(500)).toBe('10') // canvas / heavy
    // heavier never gets a finer zip
    expect(zipTeethMm(zipGaugeForWeight(500))).toBeGreaterThan(zipTeethMm(zipGaugeForWeight(90)))
  })

  it('lengths differ sensibly by category', () => {
    expect(zipLengthForCategory('bottom')).toBeLessThan(zipLengthForCategory('dress')) // a fly vs a back zip
    expect(zipLengthForCategory('outerwear')).toBeGreaterThan(0)
  })

  it('a jacket resolves to a separating (often two-way) zip; a dress to a closed-end one', () => {
    const jacket = zipperSpecFor('outerwear', 320)
    expect(jacket.separating).toBe(true)
    expect(jacket.pull).toBe('ring')
    expect(zipSliderCount(jacket)).toBe(2) // long separating jacket → two-way
    const dress = zipperSpecFor('dress', 110)
    expect(dress.separating).toBe(false)
    expect(zipSliderCount(dress)).toBe(1)
  })

  it('summarises a spec into one tech-pack line', () => {
    const s = zipperSummary(zipperSpecFor('outerwear', 320))
    expect(s).toContain('#8')
    expect(s).toContain('separating')
    expect(s).toContain('two-way')
    expect(s).toContain('ring pull')
  })
})
