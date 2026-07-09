import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { exportUSDZ, exportOBJ } from '../src/renderer/export/exporters3d'

const box = (color = 0x3b5b82): THREE.Mesh =>
  new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.2), new THREE.MeshStandardMaterial({ color }))

// A garment stand-in: an outer shell + a render-only lining child the exporters
// must drop. (GLB is exercised in-app — GLTFExporter's binary path needs a DOM
// FileReader that isn't present in the headless test env, so it's not asserted here.)
function meshes(): THREE.Object3D[] {
  const shell = box()
  const lining = box()
  lining.userData.lining = true
  shell.add(lining)
  return [shell]
}

describe('3D exporters — AR/interchange formats', () => {
  it('exports a non-empty USDZ (a zip → PK header) for AR Quick Look', async () => {
    const usdz = await exportUSDZ(meshes())
    expect(usdz).toBeInstanceOf(Uint8Array)
    expect(usdz.byteLength).toBeGreaterThan(0)
    expect(usdz[0]).toBe(0x50) // 'P' — USDZ is an (uncompressed) zip
    expect(usdz[1]).toBe(0x4b) // 'K'
  })

  it('strips the render-only lining shell from the export', () => {
    const count = (s: string): number => (s.match(/^v /gm) ?? []).length
    const withLining = exportOBJ(meshes()) // includes a lining child that must be dropped
    const bare = exportOBJ([box()]) // a single box, no lining
    expect(count(bare)).toBeGreaterThan(0)
    expect(count(withLining)).toBe(count(bare)) // lining stripped → identical vertex count
  })
})
