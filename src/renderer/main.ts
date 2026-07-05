import './ui/styles.css'
import { Viewport } from './core/Viewport'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin, type AnimationMode } from './avatar/Mannequin'
import { GarmentController } from './garment/GarmentController'
import { GARMENT_TYPES, type GarmentType } from './garment/templates'
import { PatternController } from './pattern/PatternController'
import { DEFAULT_PATTERN } from './pattern/pattern'
import { createFabricMaterial, applyFabric } from './cloth/FabricMaterial'
import { FABRIC_LIBRARY, getFabric, fabricToSolverParams, type Fabric } from './fabric/FabricLibrary'
import { exportGLB, exportOBJ } from './export/exporters3d'
import { patternToSVG, patternToDXF } from './export/patternExport'
import { techpackHTML, techpackJSON, type TechpackData } from './export/techpack'
import { saveFile } from './export/save'
import { createControlPanel, type DesignMode, type ExportFormat } from './ui/panel'
import { showStartPage } from './start/StartPage'
import { buildDesignArt, defaultConfig, hasArt, type DesignArt, type DesignConfig } from './start/design'

// ---- shared scene (built once) -------------------------------------------
const container = document.getElementById('app') as HTMLElement
const viewport = new Viewport(container)
setupEnvironment(viewport.scene, viewport.renderer)
const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)

/** Build the full 3D studio from a design config (called after the start page). */
function initStudio(config: DesignConfig): void {
  const current: Fabric = { ...getFabric(config.fabricId), color: config.color }
  const material = createFabricMaterial(current)

  // Your uploaded graphic/text becomes the garment's albedo map (weave stays on top).
  let design: DesignArt | null = null
  if (hasArt(config)) {
    design = buildDesignArt(config)
    material.map = design.texture
    material.color.set(0xffffff)
  }

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

  const garment = {
    type: config.garmentType,
    length: config.length,
    ease: config.ease,
    flare: config.flare
  }
  const patternParams = { ...DEFAULT_PATTERN }
  const anim = { mode: 'static' as AnimationMode, speed: 1 }
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
  function setAnimMode(m: AnimationMode): void {
    anim.mode = m
    viewport.controls.autoRotate = m === 'turn'
    viewport.controls.autoRotateSpeed = anim.speed * 2.2
  }

  function applyFabricVisual(): void {
    applyFabric(material, current)
    if (design) {
      material.map = design.texture
      material.color.set(0xffffff) // the design canvas owns the base colour
    }
  }
  function applyFabricPhysics(): void {
    if (mode === 'templates') garmentCtl.setFabricPhysics()
    else patternCtl.setFabricPhysics()
  }
  function setColor(hex: number): void {
    current.color = hex
    if (design) {
      config.color = hex
      design.redraw()
    } else {
      applyFabricVisual()
    }
  }

  // ---- loop ----
  let simTime = 0
  const loop = new Loop(
    (dt) => {
      simTime += dt
      mannequin.update(simTime, anim.mode, anim.speed)
      active.step(dt)
    },
    () => {
      active.updateMeshes()
      viewport.render()
    }
  )

  setMode(mode)
  applyFabricVisual()
  loop.start()

  // ---- deep-links (snapshots) ----
  const params = new URLSearchParams(location.search)
  const modeParam = params.get('mode')
  if (modeParam === 'pattern') setMode('pattern')
  const animParam = params.get('anim') as AnimationMode | null
  if (animParam) setAnimMode(animParam)

  // ---- export ----
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

  // ---- UI ----
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
      const base = current.color
      Object.assign(current, getFabric(id))
      if (design) current.color = base // keep the design's base colour
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
    onExport: (fmt) => void doExport(fmt).catch((err) => console.error('Export failed', err)),
    anim,
    onSetAnimMode: setAnimMode,
    onAnimSpeed: (v) => {
      anim.speed = v
      viewport.controls.autoRotateSpeed = v * 2.2
    },
    onColor: setColor
  })

  if (params.get('closeup') === '1') {
    viewport.camera.position.set(0.12, 1.16, 0.62)
    viewport.controls.target.set(0, 1.08, 0.12)
    viewport.controls.update()
  }
}

// ---- entry: start page, unless a snapshot deep-link jumps straight in -----
const entryParams = new URLSearchParams(location.search)
const skipStart =
  entryParams.has('garment') ||
  entryParams.has('fabric') ||
  entryParams.has('mode') ||
  entryParams.has('anim') ||
  entryParams.get('start') === '0'

if (skipStart) {
  const cfg = defaultConfig()
  const g = entryParams.get('garment') as GarmentType | null
  if (g && GARMENT_TYPES.includes(g)) cfg.garmentType = g
  const fb = entryParams.get('fabric')
  if (fb) {
    cfg.fabricId = fb
    cfg.color = getFabric(fb).color
  }
  const txt = entryParams.get('text')
  if (txt) cfg.text = txt // lets snapshots exercise the printed-design map
  initStudio(cfg)
} else {
  showStartPage(FABRIC_LIBRARY, initStudio)
}
