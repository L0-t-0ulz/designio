import '@fontsource-variable/inter'
import './ui/tokens.css'
import './ui/styles.css'
import './ui/shell.css'
import { Viewport } from './core/Viewport'
import { createStudioShell } from './shell/StudioShell'
import { buildMenuBar } from './shell/menuBar'
import { buildStatusBar, type StatusHandles } from './shell/statusBar'
import { buildLibrary } from './shell/library'
import { buildObjectBrowser } from './shell/objectBrowser'
import { buildCenterTabs } from './shell/centerTabs'
import type { Preset } from './start/presets'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin, type AnimationMode } from './avatar/Mannequin'
import { GarmentController } from './garment/GarmentController'
import type { GarmentType } from './garment/templates'
import { GARMENT_IDS, getGarment } from './garments/registry'
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
import { showHomepage } from './start/Homepage'
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
    () => fabricToSolverParams(current),
    mannequin.bodyCollider
  )
  const patternCtl = new PatternController(
    viewport.scene,
    material,
    mannequin.colliders,
    () => fabricToSolverParams(current),
    mannequin.bodyCollider
  )

  const garment = {
    type: config.garmentType,
    length: config.length,
    ease: config.ease,
    flare: config.flare,
    neckline: config.neckline,
    sleeve: config.sleeve
  }
  const patternParams = { ...DEFAULT_PATTERN }
  const anim = { mode: 'static' as AnimationMode, speed: 1 }
  const bodySize = {
    bodyType: config.bodyType,
    height: config.bodyHeight,
    build: config.bodyBuild,
    bust: config.bodyBust,
    waist: config.bodyWaist,
    hips: config.bodyHips
  }
  let mode: DesignMode = 'templates'

  function setBody(next: typeof bodySize): void {
    mannequin.resize(next)
    if (mode === 'templates') garmentCtl.build(garment.type, garment)
    else patternCtl.build(patternParams)
  }

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
  let statusHandles: StatusHandles | null = null
  let frames = 0
  let fpsT = performance.now()
  const loop = new Loop(
    (dt) => {
      simTime += dt
      mannequin.update(simTime, anim.mode, anim.speed)
      active.step(dt)
    },
    () => {
      active.updateMeshes()
      viewport.render()
      frames++
      const now = performance.now()
      if (now - fpsT >= 500) {
        statusHandles?.setFps((frames * 1000) / (now - fpsT))
        frames = 0
        fpsT = now
      }
    }
  )

  setMode(mode)
  const { bodyType: bt, ...bodyScales } = bodySize
  if (bt !== 'female' || Object.values(bodyScales).some((v) => v !== 1)) setBody(bodySize)
  applyFabricVisual()
  loop.start()

  // ---- professional studio shell (menu bar · viewport · dock · status bar) ----
  const shell = createStudioShell(() => viewport.resize())
  viewport.mount(shell.center)
  const centerTabs = buildCenterTabs(shell.center, () =>
    patternToSVG({ bust: patternParams.bust, length: patternParams.length })
  )

  // ---- deep-links (snapshots) ----
  const params = new URLSearchParams(location.search)
  const modeParam = params.get('mode')
  if (modeParam === 'pattern') setMode('pattern')
  const animParam = params.get('anim') as AnimationMode | null
  if (animParam) setAnimMode(animParam)
  const bodyParams: [string, 'height' | 'build' | 'bust' | 'waist' | 'hips'][] = [
    ['bodyH', 'height'],
    ['bodyB', 'build'],
    ['bodyBust', 'bust'],
    ['bodyWaist', 'waist'],
    ['bodyHips', 'hips']
  ]
  let bodyChanged = false
  const btParam = params.get('bodyType')
  if (btParam === 'male' || btParam === 'female') {
    bodySize.bodyType = btParam
    bodyChanged = true
  }
  for (const [q, key] of bodyParams) {
    const v = params.get(q)
    if (v) {
      bodySize[key] = +v
      bodyChanged = true
    }
  }
  if (bodyChanged) setBody(bodySize)
  if (params.get('body') === 'mesh') mannequin.setBodyMode(false)

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

  // ---- navigation out of the studio ----
  function teardown(): void {
    loop.stop()
    shell.dispose()
    garmentCtl.clear()
    patternCtl.clear()
  }
  // "← Start": back to the builder, keeping this design.
  function goBack(): void {
    teardown()
    showStartPage(FABRIC_LIBRARY, initStudio, config, openHome)
  }
  // "New design": start fresh from the homepage launcher.
  function goHome(): void {
    teardown()
    openHome()
  }

  // ---- menu bar + status bar (wired to the real actions) ----
  let simpleView = false
  buildMenuBar(shell.menubar, {
    onNew: goHome,
    onExport: (fmt) => void doExport(fmt).catch((err) => console.error('Export failed', err)),
    onAnim: setAnimMode,
    onToggleWireframe: () => (material.wireframe = !material.wireframe),
    onToggleMannequin: () => (mannequin.group.visible = !mannequin.group.visible),
    onToggleLibrary: () => shell.toggleLeft(),
    onTogglePanel: () => shell.toggleRight(),
    onToggleSimple: () => {
      simpleView = !simpleView
      shell.setLeftVisible(!simpleView) // Simple = calm subset (hide Library + Object Browser)
      objBrowser.setVisible(!simpleView)
    },
    onResetLayout: () => shell.resetLayout(),
    onAbout: () =>
      window.alert('DesignIO — a fully-3D clothing design studio.\n© Zayan Khan. All rights reserved.')
  })
  let running = true
  statusHandles = buildStatusBar(
    shell.statusbar,
    () => {
      running = !running
      loop.setRunning(running)
      statusHandles?.setSim(running)
    },
    running
  )

  // ---- control panel (docked into the right region) ----
  let syncBrowsers: () => void = () => {}
  const { panel, api } = createControlPanel({
    loop,
    viewport,
    material,
    mannequin: mannequin.group,
    fabrics: FABRIC_LIBRARY,
    current,
    garment,
    patternParams,
    mode,
    onSetMode: setMode,
    onSelectFabric: (id) => {
      const base = current.color
      Object.assign(current, getFabric(id))
      if (design) current.color = base // keep the design's base colour
      applyFabricVisual()
      applyFabricPhysics()
      syncBrowsers()
    },
    onVisualEdit: applyFabricVisual,
    onPhysicsEdit: applyFabricPhysics,
    onGarmentEdit: () => {
      garmentCtl.build(garment.type, garment)
      syncBrowsers()
    },
    onPatternEdit: () => {
      patternCtl.build(patternParams)
      centerTabs.refresh()
    },
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
    onColor: (h) => {
      setColor(h)
      syncBrowsers()
    },
    bodySize,
    onBodySize: (b) => {
      setBody(b)
      syncBrowsers()
    },
    onBodyMode: (realistic) => {
      mannequin.setBodyMode(realistic)
      if (mode === 'templates') garmentCtl.redrape()
      else patternCtl.resew()
    },
    onSelectContext: (label) => statusHandles?.setSelection(label),
    onBack: goBack
  })

  // ---- Object Browser (top of the right dock) + docked control panel below ----
  const objBrowser = buildObjectBrowser(
    shell.right,
    () => (mode === 'templates' ? garmentCtl.getPieces() : []),
    () => current.color,
    (name) => {
      api.setContext('garment')
      statusHandles?.setSelection(name)
    }
  )
  shell.right.appendChild(panel)

  // ---- Library (left): browse + apply, staying in sync with the panel ----
  function applyPreset(p: Preset): void {
    const c = p.config
    if (c.garmentType) {
      garment.type = c.garmentType
      Object.assign(garment, getGarment(c.garmentType).defaults)
    }
    if (c.length != null) garment.length = c.length
    if (c.ease != null) garment.ease = c.ease
    if (c.flare != null) garment.flare = c.flare
    if (c.neckline) garment.neckline = c.neckline
    if (c.sleeve) garment.sleeve = c.sleeve
    api.syncGarment()
    garmentCtl.build(garment.type, garment)
    if (c.fabricId) api.selectFabric(c.fabricId)
    if (c.color != null) setColor(c.color)
    syncBrowsers()
  }
  const library = buildLibrary(shell.left, {
    selectGarment: (id) => {
      api.setContext('garment')
      api.selectGarment(id)
    },
    selectFabric: api.selectFabric,
    setFigure: (t) => {
      api.setContext('avatar')
      api.setFigure(t)
    },
    applyPreset,
    currentGarment: () => garment.type,
    currentFabric: () => current.id,
    currentBodyType: () => bodySize.bodyType
  })
  syncBrowsers = () => {
    library.refresh()
    objBrowser.refresh()
  }

  if (params.get('closeup') === '1') {
    viewport.camera.position.set(0.12, 1.16, 0.62)
    viewport.controls.target.set(0, 1.08, 0.12)
    viewport.controls.update()
  }
}

// ---- the app launcher (Homepage → start page → studio) -----
function openHome(): void {
  showHomepage({
    onNewDesign: () => showStartPage(FABRIC_LIBRARY, initStudio, undefined, openHome),
    // Templates open the preview pre-filled (Homepage → Preview → Studio), so the
    // route is consistent and you can tweak before entering 3D.
    onTemplate: (cfg) => showStartPage(FABRIC_LIBRARY, initStudio, cfg, openHome)
  })
}

// ---- entry: homepage, unless a snapshot deep-link jumps straight in -----
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
  if (g && GARMENT_IDS.includes(g)) {
    cfg.garmentType = g
    Object.assign(cfg, getGarment(g).defaults) // show the garment as designed (e.g. a gown = strapless/long)
  }
  const fb = entryParams.get('fabric')
  if (fb) {
    cfg.fabricId = fb
    cfg.color = getFabric(fb).color
  }
  const txt = entryParams.get('text')
  if (txt) cfg.text = txt // lets snapshots exercise the printed-design map
  initStudio(cfg)
} else if (entryParams.get('page') === 'start') {
  showStartPage(FABRIC_LIBRARY, initStudio, undefined, openHome) // deep-link to the builder
} else {
  openHome()
}
