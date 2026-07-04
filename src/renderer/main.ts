import * as THREE from 'three'
import { Viewport } from './core/Viewport'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin } from './avatar/Mannequin'
import { buildTubeGarment, fillTube, type TubeSpec } from './cloth/Garment'
import { XPBDSolver } from './cloth/XPBDSolver'
import { createFabricMaterial } from './cloth/FabricMaterial'
import { FABRICS, type FabricName } from './cloth/fabricPresets'
import { createControlPanel } from './ui/panel'

// ---- scene ---------------------------------------------------------------
const container = document.getElementById('app') as HTMLElement
const viewport = new Viewport(container)
setupEnvironment(viewport.scene, viewport.renderer)

const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)

// ---- garment -------------------------------------------------------------
// A sleeveless tube dress/tunic wrapped around the body. The top ring is pinned
// (a snug bodice at chest height) so it reliably stays on; the rest drapes and
// flares over the hips with real folds.
const garmentSpec: TubeSpec = {
  rings: 46,
  radial: 60,
  topY: 1.4,
  bottomY: 0.7,
  radiusTop: 0.17,
  radiusBottom: 0.26
}

const initialFabric: FabricName = 'cotton'
const { geometry, positions, nx, ny, pinnedTop } = buildTubeGarment(garmentSpec)
const material = createFabricMaterial(FABRICS[initialFabric].color)

const garmentMesh = new THREE.Mesh(geometry, material)
garmentMesh.castShadow = true
garmentMesh.receiveShadow = true
garmentMesh.frustumCulled = false
viewport.scene.add(garmentMesh)

const solver = new XPBDSolver(nx, ny, positions, FABRICS[initialFabric], {
  pinned: pinnedTop,
  wrapX: true
})
solver.colliders = mannequin.colliders

function respawn(): void {
  fillTube(positions, garmentSpec)
  solver.reset()
  geometry.attributes.position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
}

// ---- loop ----------------------------------------------------------------
const loop = new Loop(
  (dt) => solver.step(dt),
  () => {
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
    viewport.render()
  }
)
loop.start()

// ---- UI ------------------------------------------------------------------
createControlPanel({
  loop,
  solver,
  material,
  mannequin: mannequin.group,
  onFabricChange: (name) => {
    solver.setFabric(FABRICS[name])
    material.color.set(FABRICS[name].color)
    respawn()
  },
  onDrop: respawn
})

// Expose handles for debugging from the devtools console (dev builds only).
if (import.meta.env.DEV) {
  Object.assign(window, { __designio: { viewport, solver, respawn } })
}
