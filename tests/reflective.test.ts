import { describe, it, expect } from 'vitest'
import { reflectiveTrimLook } from '../src/renderer/fabric/reflective'
import {
  captureColorway,
  applyColorway,
  defaultLayer,
  serializeDoc,
  parseDoc,
  docFromConfig,
  type GarmentLayerData
} from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

describe('reflective piping — retroreflective trim look', () => {
  it('is a bright, low-roughness silvered recipe', () => {
    const r = reflectiveTrimLook()
    expect(r.emissiveLift).toBeGreaterThan(0.5) // lifted well toward white for the glow
    expect(r.emissiveLift).toBeLessThanOrEqual(1)
    expect(r.emissiveIntensity).toBeGreaterThan(0) // self-lit so it reads out of the key light
    expect(r.roughness).toBeLessThan(0.5) // catches the room like reflective tape
    expect(r.envMapIntensity).toBeGreaterThan(1) // reflects the studio env more than matte cloth
  })
})

describe('reflective piping — persistence', () => {
  it('a colorway captures + re-applies the reflective-trim flag', () => {
    const l = defaultLayer('beanie')
    l.trim = true
    l.reflectiveTrim = true
    const cw = captureColorway(l, 'Hi-vis')
    expect(cw.reflectiveTrim).toBe(true)
    const l2 = defaultLayer('beanie')
    applyColorway(l2, cw)
    expect(l2.reflectiveTrim).toBe(true)
  })

  it('survives a .dio save/open round-trip', () => {
    const doc = docFromConfig(defaultConfig())
    const layer: GarmentLayerData = doc.layers[0]
    layer.trim = true
    layer.reflectiveTrim = true
    const round = parseDoc(serializeDoc(doc))
    expect(round.layers[0].reflectiveTrim).toBe(true)
  })

  it('defaults off — a plain garment has no reflective trim', () => {
    expect(defaultLayer('top').reflectiveTrim).toBeUndefined()
  })
})
