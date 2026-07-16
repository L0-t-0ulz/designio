import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildTubeGarment, type TubeSpec } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

// a firm rib-knit band — grips the head
const ribKnit: FabricParams = {
  mass: 0.25,
  stretchCompliance: 8e-5,
  bendCompliance: 5e-3,
  damping: 0.05,
  friction: 0.7,
  aero: 0,
  color: 0x808080
}

const R = 0.09 // head radius (m)
// a knit brow band drafted TIGHTER than the head — it stretches over the skull and
// grips the circumference at the brow / temple line
const band: TubeSpec = { rings: 6, radial: 20, topY: 1.63, bottomY: 1.52, radiusTop: R - 0.012, radiusBottom: R - 0.012 }
const head = { a: new THREE.Vector3(0, 1.5, 0), b: new THREE.Vector3(0, 1.62, 0), radius: R }

const build = () => {
  const { positions, nx, ny, pinnedTop } = buildTubeGarment(band)
  const s = new XPBDSolver(nx, ny, positions, ribKnit, { wrapX: true, pinned: pinnedTop })
  s.colliders = [head]
  for (let i = 0; i < 160; i++) s.step(1 / 60)
  return { s, positions, nx, ny, pinnedTop }
}

describe('brow pressure map — a snug knit band grips the head', () => {
  it('the contact-pressure map lights up where the band presses into the brow', () => {
    const { s, nx, ny, pinnedTop } = build()
    const pressure = new Float32Array(s.count)
    s.contactPressure(pressure)

    // the snug band presses into the head — the pressure map is non-zero
    expect(Math.max(...pressure)).toBeGreaterThan(0)

    // the pressure is on the gripping band, not the pinned top edge: the free rows
    // (which settle onto the head) carry real contact pressure
    let freeSum = 0
    let freeN = 0
    for (let k = 0; k < nx * ny; k++) {
      if (pinnedTop.includes(k)) continue
      freeSum += pressure[k]
      freeN++
    }
    expect(freeSum / freeN).toBeGreaterThan(0) // the band grips all around
  })

  it('stays stable + finite while gripping the head', () => {
    const { positions } = build()
    for (const v of positions) expect(Number.isFinite(v)).toBe(true)
  })
})
