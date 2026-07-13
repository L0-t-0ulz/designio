import { describe, it, expect } from 'vitest'
import { defaultLayer, layerShown, parseDoc, serializeDoc, type ProjectDoc } from '../src/renderer/studio/document'

describe('smoothing slip underlayer', () => {
  it('the render rule: underlayers stay visible to the sim but never draw', () => {
    expect(layerShown({ visible: true })).toBe(true)
    expect(layerShown({ visible: true, underlayer: true })).toBe(false) // sim yes, render no
    expect(layerShown({ visible: false })).toBe(false)
    expect(layerShown({ visible: false, underlayer: true })).toBe(false)
  })

  it('the underlayer flag rides the layer through the .dio', () => {
    const doc: ProjectDoc = {
      version: 1,
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      scene: { gravity: 9.81, windX: 0, windZ: 0, animMode: 'static', animSpeed: 1 },
      layers: [defaultLayer('dress'), { ...defaultLayer('slip-dress'), ease: 0.003, underlayer: true }],
      activeIndex: 0
    }
    const back = parseDoc(serializeDoc(doc))
    expect(back.layers[1].underlayer).toBe(true)
    expect(back.layers[0].underlayer).toBeUndefined()
  })
})
