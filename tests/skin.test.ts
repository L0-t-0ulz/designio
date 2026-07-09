import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { SKIN_LOOK, makeSkinMaterial, skinLook, SKIN_TONES, SKIN_TONE_HEX, UNDERTONES } from '../src/renderer/avatar/skin'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, serializeDoc, parseDoc } from '../src/renderer/studio/document'

const chan = (hex: number): [number, number, number] => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]
const lightness = (hex: number): number => {
  const hsl = { h: 0, s: 0, l: 0 }
  new THREE.Color(hex).getHSL(hsl)
  return hsl.l
}

describe('default avatar skin look', () => {
  it('is a warm skin tone (red > green > blue)', () => {
    const [r, g, b] = chan(SKIN_LOOK.color)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
    expect(r).toBeGreaterThan(150) // a light-ish mid skin tone, not muddy
  })

  it('the sheen rim is warm (fakes soft subsurface at grazing angles)', () => {
    const [r, , b] = chan(SKIN_LOOK.sheenColor)
    expect(r).toBeGreaterThan(b) // warmer than it is cool
    expect(SKIN_LOOK.sheen).toBeGreaterThan(0)
  })

  it('reads semi-matte with only a whisper of self-glow', () => {
    expect(SKIN_LOOK.roughness).toBeGreaterThan(0.4)
    expect(SKIN_LOOK.roughness).toBeLessThan(0.75)
    expect(SKIN_LOOK.emissiveIntensity).toBeGreaterThan(0)
    expect(SKIN_LOOK.emissiveIntensity).toBeLessThan(0.15) // subtle, not glowing
  })

  it('builds a non-metallic sheened material', () => {
    const m = makeSkinMaterial()
    expect(m.metalness).toBe(0)
    expect(m.sheen).toBeGreaterThan(0)
    expect(m.roughness).toBeCloseTo(SKIN_LOOK.roughness, 5)
  })
})

describe('skin-tone & complexion picker', () => {
  it('the tone ramp goes strictly fair → deep (monotonically darker)', () => {
    const ls = SKIN_TONES.map((t) => lightness(SKIN_TONE_HEX[t]))
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1])
  })

  it('skinLook preserves the tone lightness (undertone only shifts hue/sat)', () => {
    for (const t of SKIN_TONES) {
      const baseL = lightness(SKIN_TONE_HEX[t])
      for (const u of UNDERTONES) expect(lightness(skinLook(t, u).color)).toBeCloseTo(baseL, 2)
    }
  })

  it('a warm undertone is warmer (redder) than a cool one at the same tone', () => {
    const warm = new THREE.Color(skinLook('medium', 'warm').color)
    const cool = new THREE.Color(skinLook('medium', 'cool').color)
    expect(warm.r - warm.b).toBeGreaterThan(cool.r - cool.b)
    expect(skinLook('medium', 'warm').sheenColor).not.toBe(skinLook('medium', 'cool').sheenColor)
  })

  it('the emissive subsurface glow is darker than the skin colour', () => {
    for (const t of SKIN_TONES) expect(lightness(skinLook(t).emissive)).toBeLessThan(lightness(skinLook(t).color))
  })

  it('skin tone + undertone round-trip through save/parse; unknown tones drop', () => {
    const c = defaultConfig()
    c.skinTone = 'deep'
    c.undertone = 'cool'
    const body = parseDoc(serializeDoc(docFromConfig(c))).body
    expect(body.skinTone).toBe('deep')
    expect(body.undertone).toBe('cool')

    const raw = JSON.parse(serializeDoc(docFromConfig(defaultConfig())))
    raw.body.skinTone = 'bogus'
    expect(parseDoc(JSON.stringify(raw)).body.skinTone).toBeUndefined()
  })
})
