import { describe, it, expect } from 'vitest'
import { interfaceParams, fabricToSolverParams, getFabric } from '../src/renderer/fabric/FabricLibrary'

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
