import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildTubeGarment, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

// a light knit beanie — flutters readily so the storm has plenty to grab
const knit: FabricParams = {
  mass: 0.2,
  stretchCompliance: 5e-5,
  bendCompliance: 5e-3,
  damping: 0.05,
  friction: 0.6,
  aero: 0.4,
  color: 0x808080
}

// a beanie tube: a gathered crown (small top radius) down to a band that grips the head
const beanieSpec: TubeSpec = { rings: 10, radial: 16, topY: 1.68, bottomY: 1.46, radiusTop: 0.03, radiusBottom: 0.11 }
const head = { a: new THREE.Vector3(0, 1.54, 0), b: new THREE.Vector3(0, 1.66, 0), radius: 0.09 }

const centroid = (positions: Float32Array, count: number): THREE.Vector3 => {
  const c = new THREE.Vector3()
  for (let k = 0; k < count; k++) c.add(new THREE.Vector3(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]))
  return c.multiplyScalar(1 / count)
}

describe('storm keep-on — headwear pinned to the head survives a storm', () => {
  it('the pinned crown holds the beanie on the head; the cloth flutters but stays anchored + stable', () => {
    const { positions, nx, ny, pinnedTop } = buildTubeGarment(beanieSpec)
    const s = new XPBDSolver(nx, ny, positions, knit, { wrapX: true, pinned: pinnedTop })
    s.colliders = [head]
    const count = nx * ny
    const pinStart = pinnedTop.map((k) => [positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]] as const)
    const freeStart = positions.slice()

    // a storm: a strong, gusty lateral wind that would blow an unpinned hat away
    s.wind.set(7, 0, 4)
    s.turbulence = 1
    for (let i = 0; i < 180; i++) s.step(1 / 60)

    // 1. the pinned crown ring never moved — the hat stays gripped on the head
    pinnedTop.forEach((k, i) => {
      expect(positions[k * 3]).toBeCloseTo(pinStart[i][0], 6)
      expect(positions[k * 3 + 1]).toBeCloseTo(pinStart[i][1], 6)
      expect(positions[k * 3 + 2]).toBeCloseTo(pinStart[i][2], 6)
    })

    // 2. every particle is finite — the storm didn't blow the solver up
    for (let k = 0; k < count * 3; k++) expect(Number.isFinite(positions[k])).toBe(true)

    // 3. the free cloth actually reacted to the wind (it's not a rigid lump)
    let maxMove = 0
    for (const k of Array.from({ length: count }, (_, i) => i)) {
      if (pinnedTop.includes(k)) continue
      maxMove = Math.max(maxMove, Math.hypot(positions[k * 3] - freeStart[k * 3], positions[k * 3 + 2] - freeStart[k * 3 + 2]))
    }
    expect(maxMove).toBeGreaterThan(0.01) // the tails/skirt flutter

    // 4. …but the whole hat stayed on the head — its centroid never blew away
    const c = centroid(positions, count)
    expect(c.distanceTo(new THREE.Vector3(0, 1.6, 0))).toBeLessThan(0.3)
  })
})
