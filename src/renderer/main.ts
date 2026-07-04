import * as THREE from 'three'
import { Viewport } from './core/Viewport'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin } from './avatar/Mannequin'
import { buildClothGeometry, computeHoleDeadSet, fillFlatGrid } from './cloth/ClothMesh'
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

// ---- cloth panel ---------------------------------------------------------
const NX = 48
const NY = 48
const SPACING = 0.028 // ~1.32 m square panel
const HOLE_RADIUS = 0.16 // neck hole -> the head threads through, so it hangs
// from the shoulders like a poncho/tunic. Spawn just above the head so the hole
// drops straight over it.
const spawn = new THREE.Vector3(
  -((NX - 1) * SPACING) / 2,
  1.88,
  -((NY - 1) * SPACING) / 2
)

const initialFabric: FabricName = 'cotton'
const dead = computeHoleDeadSet(NX, NY, SPACING, HOLE_RADIUS)
const { geometry, positions } = buildClothGeometry(NX, NY, SPACING, spawn, dead)
const material = createFabricMaterial(FABRICS[initialFabric].color)

const clothMesh = new THREE.Mesh(geometry, material)
clothMesh.castShadow = true
clothMesh.receiveShadow = true
clothMesh.frustumCulled = false
viewport.scene.add(clothMesh)

const solver = new XPBDSolver(NX, NY, SPACING, positions, FABRICS[initialFabric], { dead })
solver.colliders = mannequin.colliders

function respawn(): void {
  fillFlatGrid(positions, NX, NY, SPACING, spawn)
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

// Expose handles for debugging from the devtools console.
Object.assign(window, { __designio: { viewport, solver, respawn } })
