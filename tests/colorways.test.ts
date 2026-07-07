import { describe, it, expect } from 'vitest'
import {
  captureColorway,
  applyColorway,
  defaultLayer,
  docFromConfig,
  serializeDoc,
  parseDoc,
  type GarmentLayerData
} from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

function styled(): GarmentLayerData {
  const l = defaultLayer('dress')
  l.color = 0x123456
  l.fabricId = 'denim'
  l.trim = true
  l.trimColor = 0xffffff
  l.textile = 'plaid'
  l.sparkle = 'sequins'
  l.quilt = 'diamond'
  l.partFabrics = { back: { fabricId: 'satin', color: 0xff0000 } }
  return l
}

describe('colorways — saved colour/fabric variants', () => {
  it('captures the appearance fields (colour · fabric · trim · finishes · per-part)', () => {
    const cw = captureColorway(styled(), 'Midnight')
    expect(cw.name).toBe('Midnight')
    expect(cw.id).toBeTruthy()
    expect(cw.color).toBe(0x123456)
    expect(cw.fabricId).toBe('denim')
    expect(cw.trim).toBe(true)
    expect(cw.textile).toBe('plaid')
    expect(cw.sparkle).toBe('sequins')
    expect(cw.quilt).toBe('diamond')
    expect(cw.partFabrics?.back?.fabricId).toBe('satin')
  })

  it('gives each colorway a distinct id', () => {
    expect(captureColorway(styled(), 'A').id).not.toBe(captureColorway(styled(), 'B').id)
  })

  it('deep-clones partFabrics so the colorway is a frozen snapshot', () => {
    const l = styled()
    const cw = captureColorway(l, 'x')
    l.partFabrics!.back!.fabricId = 'leather' // mutate the source after capture
    expect(cw.partFabrics?.back?.fabricId).toBe('satin') // colorway unaffected
  })

  it('applies a colorway to a layer — appearance changes, construction does not', () => {
    const cw = captureColorway(styled(), 'Look A')
    const target = defaultLayer('dress')
    target.length = 0.9
    target.neckline = 'v'
    target.collar = true
    applyColorway(target, cw)
    // appearance took the colorway
    expect(target.color).toBe(0x123456)
    expect(target.fabricId).toBe('denim')
    expect(target.textile).toBe('plaid')
    expect(target.sparkle).toBe('sequins')
    expect(target.partFabrics?.back?.fabricId).toBe('satin')
    // construction untouched
    expect(target.length).toBe(0.9)
    expect(target.neckline).toBe('v')
    expect(target.collar).toBe(true)
  })

  it('clearing a finish in the colorway clears it on apply', () => {
    const plain = defaultLayer('dress') // no textile/sparkle/quilt/trim
    const cw = captureColorway(plain, 'Plain')
    const target = styled() // has all the finishes
    applyColorway(target, cw)
    expect(target.textile).toBeUndefined()
    expect(target.sparkle).toBeUndefined()
    expect(target.quilt).toBeUndefined()
  })

  it('colorways survive save → reopen', () => {
    const c = defaultConfig()
    const doc = docFromConfig(c)
    doc.layers[0].colorways = [captureColorway(styled(), 'Saved')]
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[0].colorways?.[0].name).toBe('Saved')
    expect(back.layers[0].colorways?.[0].textile).toBe('plaid')
  })
})
