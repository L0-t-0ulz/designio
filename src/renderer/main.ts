import * as THREE from 'three'
import './ui/styles.css'
import { Viewport } from './core/Viewport'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin } from './avatar/Mannequin'
import { buildTubeGarment, fillTube, type TubeSpec } from './cloth/Garment'
import { XPBDSolver } from './cloth/XPBDSolver'
import { createFabricMaterial, applyFabric } from './cloth/FabricMaterial'
import { FABRIC_LIBRARY, getFabric, fabricToSolverParams, type Fabric } from './fabric/FabricLibrary'
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

// `current` is a mutable working copy so the inspector can tune it live.
const current: Fabric = { ...getFabric('cotton-poplin') }

const { geometry, positions, nx, ny, pinnedTop } = buildTubeGarment(garmentSpec)
const material = createFabricMaterial(current)

const garmentMesh = new THREE.Mesh(geometry, material)
garmentMesh.castShadow = true
garmentMesh.receiveShadow = true
garmentMesh.frustumCulled = false
viewport.scene.add(garmentMesh)

const solver = new XPBDSolver(nx, ny, positions, fabricToSolverParams(current), {
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

function applyFabricVisual(): void {
  applyFabric(material, current)
}

function applyFabricPhysics(): void {
  solver.setFabric(fabricToSolverParams(current))
  respawn()
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

// Optional deep-link (used by the snapshot tool / for sharing a state):
//   ?fabric=<id>&closeup=1
const params = new URLSearchParams(location.search)
const fabricParam = params.get('fabric')
if (fabricParam) {
  Object.assign(current, getFabric(fabricParam))
  applyFabricVisual()
  applyFabricPhysics()
}

// ---- UI ------------------------------------------------------------------
createControlPanel({
  loop,
  solver,
  viewport,
  material,
  mannequin: mannequin.group,
  fabrics: FABRIC_LIBRARY,
  current,
  onSelectFabric: (id) => {
    Object.assign(current, getFabric(id))
    applyFabricVisual()
    applyFabricPhysics()
  },
  onVisualEdit: applyFabricVisual,
  onPhysicsEdit: applyFabricPhysics,
  onDrop: respawn
})

if (params.get('closeup') === '1') {
  viewport.camera.position.set(0.12, 1.16, 0.62)
  viewport.controls.target.set(0, 1.08, 0.12)
  viewport.controls.update()
}

// Expose handles for debugging from the devtools console (dev builds only).
if (import.meta.env.DEV) {
  Object.assign(window, { __designio: { viewport, solver, current, respawn } })
}
