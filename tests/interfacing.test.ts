import { describe, it, expect } from 'vitest'
import { interfaceParams, corsetParams, wetParams, fabricToSolverParams, getFabric } from '../src/renderer/fabric/FabricLibrary'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig, cloneLayer, defaultLayer, serializeDoc, parseDoc } from '../src/renderer/studio/document'

describe('interfaceParams (structured / interfaced garment)', () => {
  const base = fabricToSolverParams(getFabric('wool-flannel'))
  const stiff = interfaceParams(base)

  it('stiffens bending (much lower compliance) so it holds its shape', () => {
    expect(stiff.bendCompliance).toBeLessThan(base.bendCompliance)
    expect(stiff.bendCompliance).toBeCloseTo(base.bendCompliance * 0.3, 6)
  })

  it('adds damping (settles crisp, not floppy)', () => {
    expect(stiff.damping).toBeGreaterThan(base.damping)
  })

  it('leaves mass / stretch / colour untouched', () => {
    expect(stiff.mass).toBe(base.mass)
    expect(stiff.stretchCompliance).toBe(base.stretchCompliance)
    expect(stiff.color).toBe(base.color)
  })
})

describe('corsetParams (boned / structured bodice)', () => {
  const base = fabricToSolverParams(getFabric('satin'))
  const corset = corsetParams(base)
  const interfaced = interfaceParams(base)

  it('is near-rigid — stiffer than plain interfacing (lower bend + lower stretch)', () => {
    expect(corset.bendCompliance).toBeLessThan(interfaced.bendCompliance)
    expect(corset.stretchCompliance).toBeLessThan(base.stretchCompliance) // boning resists stretch
  })

  it('adds the most damping (holds its shape against the body)', () => {
    expect(corset.damping).toBeGreaterThan(interfaced.damping)
  })

  it('keeps mass + colour', () => {
    expect(corset.mass).toBe(base.mass)
    expect(corset.color).toBe(base.color)
  })
})

describe('wetParams (waterlogged rain/swim look)', () => {
  const base = fabricToSolverParams(getFabric('cotton-poplin'))
  const wet = wetParams(base)

  it('is heavier, limper (softer bend), more damped, and barely billows', () => {
    expect(wet.mass).toBeGreaterThan(base.mass) // waterlogged
    expect(wet.bendCompliance).toBeGreaterThan(base.bendCompliance) // clings limp
    expect(wet.damping).toBeGreaterThan(base.damping) // settles fast
    expect(wet.aero).toBeLessThan(base.aero) // wet cloth doesn't catch the air
  })

  it('composes on top of a stiffener (interfaced + wet)', () => {
    const wetStiff = wetParams(interfaceParams(base))
    expect(wetStiff.mass).toBeGreaterThan(base.mass)
    expect(wetStiff.bendCompliance).toBeCloseTo(base.bendCompliance * 0.3 * 1.8, 6) // interfaced ×0.3 then wet ×1.8
  })

  it('the wet flag round-trips through save/parse and cloneLayer', () => {
    const c = defaultConfig()
    c.wet = true
    expect(parseDoc(serializeDoc(docFromConfig(c))).layers[0].wet).toBe(true)

    const layer = defaultLayer('dress')
    layer.wet = true
    const copy = cloneLayer(layer)
    copy.wet = false
    expect(layer.wet).toBe(true) // original untouched
  })
})
