import './ui/styles.css'
import { Viewport } from './core/Viewport'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin } from './avatar/Mannequin'
import { GarmentController } from './garment/GarmentController'
import { DEFAULT_PARAMS, GARMENT_TYPES, type GarmentType } from './garment/templates'
import { PatternController } from './pattern/PatternController'
import { DEFAULT_PATTERN } from './pattern/pattern'
import { createFabricMaterial, applyFabric } from './cloth/FabricMaterial'
import { FABRIC_LIBRARY, getFabric, fabricToSolverParams, type Fabric } from './fabric/FabricLibrary'
import { createControlPanel, type DesignMode } from './ui/panel'

// ---- scene ---------------------------------------------------------------
const container = document.getElementById('app') as HTMLElement
const viewport = new Viewport(container)
setupEnvironment(viewport.scene, viewport.renderer)

const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)

// ---- garment(s) ----------------------------------------------------------
const current: Fabric = { ...getFabric('cotton-poplin') }
const material = createFabricMaterial(current)

const garmentCtl = new GarmentController(
  viewport.scene,
  material,
  mannequin.colliders,
  mannequin.measurements,
  () => fabricToSolverParams(current)
)
const patternCtl = new PatternController(
  viewport.scene,
  material,
  mannequin.colliders,
  () => fabricToSolverParams(current)
)

const garment = { type: 'dress' as GarmentType, ...DEFAULT_PARAMS }
const patternParams = { ...DEFAULT_PATTERN }
let mode: DesignMode = 'templates'

interface Steppable {
  step(dt: number): void
  updateMeshes(): void
}
let active: Steppable = garmentCtl

function setMode(m: DesignMode): void {
  mode = m
  if (m === 'templates') {
    patternCtl.clear()
    garmentCtl.build(garment.type, garment)
    active = garmentCtl
  } else {
    garmentCtl.clear()
    patternCtl.build(patternParams)
    active = patternCtl
  }
}

function applyFabricVisual(): void {
  applyFabric(material, current)
}
function applyFabricPhysics(): void {
  if (mode === 'templates') garmentCtl.setFabricPhysics()
  else patternCtl.setFabricPhysics()
}

// ---- loop ----------------------------------------------------------------
const loop = new Loop(
  (dt) => active.step(dt),
  () => {
    active.updateMeshes()
    viewport.render()
  }
)
loop.start()

// Deep-link: ?fabric=<id>&garment=<type>&mode=pattern&closeup=1
const params = new URLSearchParams(location.search)
const fabricParam = params.get('fabric')
if (fabricParam) Object.assign(current, getFabric(fabricParam))
const garmentParam = params.get('garment') as GarmentType | null
if (garmentParam && GARMENT_TYPES.includes(garmentParam)) garment.type = garmentParam
const modeParam = params.get('mode')
if (modeParam === 'pattern') mode = 'pattern'
setMode(mode)
applyFabricVisual()

// ---- UI ------------------------------------------------------------------
createControlPanel({
  loop,
  viewport,
  material,
  mannequin: mannequin.group,
  fabrics: FABRIC_LIBRARY,
  current,
  garment,
  garmentTypes: GARMENT_TYPES,
  patternParams,
  mode,
  onSetMode: setMode,
  onSelectFabric: (id) => {
    Object.assign(current, getFabric(id))
    applyFabricVisual()
    applyFabricPhysics()
  },
  onVisualEdit: applyFabricVisual,
  onPhysicsEdit: applyFabricPhysics,
  onGarmentEdit: () => garmentCtl.build(garment.type, garment),
  onPatternEdit: () => patternCtl.build(patternParams),
  onResew: () => patternCtl.resew(),
  onDrop: () => (mode === 'templates' ? garmentCtl.redrape() : patternCtl.resew()),
  onSetGravity: (v) => {
    garmentCtl.setGravity(v)
    patternCtl.setGravity(v)
  },
  onSetWind: (x, z) => {
    garmentCtl.setWind(x, z)
    patternCtl.setWind(x, z)
  }
})

if (params.get('closeup') === '1') {
  viewport.camera.position.set(0.12, 1.16, 0.62)
  viewport.controls.target.set(0, 1.08, 0.12)
  viewport.controls.update()
}

if (import.meta.env.DEV) {
  Object.assign(window, { __designio: { viewport, garmentCtl, patternCtl, current } })
}
