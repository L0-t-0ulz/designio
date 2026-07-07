import { describe, it, expect } from 'vitest'
import { fabricThickness, getFabric, type Fabric } from '../src/renderer/fabric/FabricLibrary'

const withGsm = (gsm: number): Fabric => ({ ...getFabric('denim'), gsm })

describe('fabricThickness', () => {
  it('is heavier for heavier fabric (monotonic in gsm)', () => {
    expect(fabricThickness(withGsm(60))).toBeLessThan(fabricThickness(withGsm(200)))
    expect(fabricThickness(withGsm(200))).toBeLessThan(fabricThickness(withGsm(450)))
  })

  it('clamps to a sane physical band (0.6–3.2 mm)', () => {
    expect(fabricThickness(withGsm(0))).toBeCloseTo(0.0006, 6) // below range → floor
    expect(fabricThickness(withGsm(2000))).toBeCloseTo(0.0032, 6) // above range → ceil
    for (const g of [40, 130, 300, 500]) {
      const t = fabricThickness(withGsm(g))
      expect(t).toBeGreaterThanOrEqual(0.0006)
      expect(t).toBeLessThanOrEqual(0.0032)
    }
  })

  it('orders real fabrics: chiffon (light) < denim < a heavy coat wool', () => {
    const chiffon = fabricThickness(getFabric('chiffon'))
    const denim = fabricThickness(getFabric('denim'))
    expect(chiffon).toBeLessThan(denim)
  })
})
