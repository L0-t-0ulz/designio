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
import { exportGLB, exportOBJ } from './export/exporters3d'
import { patternToSVG, patternToDXF } from './export/patternExport'
import { techpackHTML, techpackJSON, type TechpackData } from './export/techpack'
import { saveFile } from './export/save'
import { createControlPanel, type DesignMode, type ExportFormat } from './ui/panel'

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

// ---- export --------------------------------------------------------------
function techData(): TechpackData {
  return {
    design: mode === 'templates' ? `${garment.type} (template)` : 'Sewn top (pattern)',
    mode,
    garment:
      mode === 'templates'
        ? {
            type: garment.type,
            length: garment.length,
            ease_cm: +(garment.ease * 100).toFixed(1),
            flare_cm: +(garment.flare * 100).toFixed(1)
          }
        : { bust_cm: +(patternParams.bust * 100).toFixed(1), length_cm: +(patternParams.length * 100).toFixed(1) },
    fabric: current,
    measurements: mannequin.measurements
  }
}

async function doExport(fmt: ExportFormat): Promise<void> {
  const meshes = mode === 'templates' ? garmentCtl.getMeshes() : patternCtl.getMeshes()
  const dims = { bust: patternParams.bust, length: patternParams.length }
  switch (fmt) {
    case 'glb':
      await saveFile('garment.glb', await exportGLB(meshes), [{ name: 'glTF binary', extensions: ['glb'] }])
      break
    case 'obj':
      await saveFile('garment.obj', exportOBJ(meshes), [{ name: 'Wavefront OBJ', extensions: ['obj'] }])
      break
    case 'svg':
      await saveFile('pattern.svg', patternToSVG(dims), [{ name: 'SVG', extensions: ['svg'] }])
      break
    case 'dxf':
      await saveFile('pattern.dxf', patternToDXF(dims), [{ name: 'DXF', extensions: ['dxf'] }])
      break
    case 'techpack':
      await saveFile('techpack.html', techpackHTML(techData()), [{ name: 'HTML', extensions: ['html'] }])
      break
    case 'json':
      await saveFile('design.json', techpackJSON(techData()), [{ name: 'JSON', extensions: ['json'] }])
      break
  }
}

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
  },
  onExport: (fmt) => {
    void doExport(fmt).catch((err) => console.error('Export failed', err))
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
