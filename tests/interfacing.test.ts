import { describe, it, expect } from 'vitest'
import { interfaceParams, corsetParams, fabricToSolverParams, getFabric } from '../src/renderer/fabric/FabricLibrary'

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
