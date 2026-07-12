import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentParams } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { buildTubeGarment, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

// a stretchy knit — high compliance so a compression fit stretches instead of fighting
const knit: FabricParams = {
  mass: 0.25,
  stretchCompliance: 5e-5,
  bendCompliance: 5e-3,
  damping: 0.05,
  friction: 0.6,
  aero: 0,
  color: 0x808080
}

describe('compression fit (negative ease)', () => {
  it('gradeParams allows negative ease, floored at −3 cm', () => {
    const l = defaultLayer('sports-bra')
    expect(gradeParams({ ...l, ease: -0.006 }).ease).toBeCloseTo(-0.006, 10)
    expect(gradeParams({ ...l, ease: -0.5 }).ease).toBeCloseTo(-0.03, 10) // floored
    expect(gradeParams({ ...l, ease: 0.02 }).ease).toBeCloseTo(0.02, 10) // positive untouched
  })

  it('activewear drafts smaller than the body it stretches over', () => {
    for (const id of ['sports-bra', 'swimsuit'] as const) {
      const def = getGarment(id)
      const p: GarmentParams = { ...DEFAULT_PARAMS, ...def.defaults }
      const spec = garmentTubeSpecs(def, p, MEASUREMENTS)[0]
      expect(spec.radiusTop).toBeLessThan(MEASUREMENTS.chestR) // compression draft
    }
    expect(getGarment('high-waist-leggings').defaults.ease).toBeLessThan(0)
  })

  it('a compression tube settles stretched over the body — stable, strained, pressing', () => {
    const R = 0.15 // the body capsule
    const spec: TubeSpec = { rings: 12, radial: 16, topY: 1.4, bottomY: 1.1, radiusTop: R - 0.01, radiusBottom: R - 0.01 }
    const { positions, nx, ny, pinnedTop } = buildTubeGarment(spec)
    const s = new XPBDSolver(nx, ny, positions, knit, { wrapX: true, pinned: pinnedTop })
    s.colliders = [{ a: new THREE.Vector3(0, 1.45, 0), b: new THREE.Vector3(0, 1.05, 0), radius: R }]
    for (let i = 0; i < 120; i++) s.step(1 / 60)

    // stable — every particle finite, and the free rows pushed out to ~the body surface
    let minR = Infinity
    for (let k = nx; k < nx * ny; k++) {
      const x = positions[k * 3]
      const z = positions[k * 3 + 2]
      expect(Number.isFinite(x) && Number.isFinite(positions[k * 3 + 1]) && Number.isFinite(z)).toBe(true)
      minR = Math.min(minR, Math.hypot(x, z))
    }
    expect(minR).toBeGreaterThan(spec.radiusTop) // stretched beyond its drafted radius…
    expect(minR).toBeGreaterThan(R - 0.02) // …out to the body (within skin tolerance)

    // the views can see it: positive strain (tight) + real contact pressure
    const strain = new Float32Array(s.count)
    s.strain(strain)
    expect(Math.max(...strain)).toBeGreaterThan(0.01)
    const pressure = new Float32Array(s.count)
    s.contactPressure(pressure)
    expect(Math.max(...pressure)).toBeGreaterThan(0)
  })
})
