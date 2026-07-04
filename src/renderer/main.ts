import './ui/styles.css'
import { Viewport } from './core/Viewport'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin } from './avatar/Mannequin'
import { GarmentController } from './garment/GarmentController'
import { DEFAULT_PARAMS, GARMENT_TYPES, type GarmentType } from './garment/templates'
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
// `current` is a mutable working copy so the inspector can tune it live.
const current: Fabric = { ...getFabric('cotton-poplin') }
const material = createFabricMaterial(current)

const controller = new GarmentController(
  viewport.scene,
  material,
  mannequin.colliders,
  mannequin.measurements,
  () => fabricToSolverParams(current)
)

// Working garment state (mutated in place by the UI).
const garment = { type: 'dress' as GarmentType, ...DEFAULT_PARAMS }
controller.build(garment.type, garment)

function rebuildGarment(): void {
  controller.build(garment.type, garment)
}
function applyFabricVisual(): void {
  applyFabric(material, current)
}
function applyFabricPhysics(): void {
  controller.setFabricPhysics()
}

// ---- loop ----------------------------------------------------------------
const loop = new Loop(
  (dt) => controller.step(dt),
  () => {
    controller.updateMeshes()
    viewport.render()
  }
)
loop.start()

// Optional deep-link (snapshot tool / sharing): ?fabric=<id>&garment=<type>&closeup=1
const params = new URLSearchParams(location.search)
const fabricParam = params.get('fabric')
if (fabricParam) {
  Object.assign(current, getFabric(fabricParam))
  applyFabricVisual()
  applyFabricPhysics()
}
const garmentParam = params.get('garment') as GarmentType | null
if (garmentParam && GARMENT_TYPES.includes(garmentParam)) {
  garment.type = garmentParam
  rebuildGarment()
}

// ---- UI ------------------------------------------------------------------
createControlPanel({
  loop,
  controller,
  viewport,
  material,
  mannequin: mannequin.group,
  fabrics: FABRIC_LIBRARY,
  current,
  garment,
  garmentTypes: GARMENT_TYPES,
  onSelectFabric: (id) => {
    Object.assign(current, getFabric(id))
    applyFabricVisual()
    applyFabricPhysics()
  },
  onVisualEdit: applyFabricVisual,
  onPhysicsEdit: applyFabricPhysics,
  onGarmentEdit: rebuildGarment,
  onDrop: () => controller.redrape()
})

if (params.get('closeup') === '1') {
  viewport.camera.position.set(0.12, 1.16, 0.62)
  viewport.controls.target.set(0, 1.08, 0.12)
  viewport.controls.update()
}

// Expose handles for debugging from the devtools console (dev builds only).
if (import.meta.env.DEV) {
  Object.assign(window, { __designio: { viewport, controller, current, garment } })
}
