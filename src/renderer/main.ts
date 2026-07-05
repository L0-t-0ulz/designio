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
import type { GarmentType } from './garment/templates'
import { GARMENT_IDS, getGarment } from './garments/registry'
import { PatternController } from './pattern/PatternController'
import { DEFAULT_PATTERN } from './pattern/pattern'
import { FABRIC_LIBRARY, getFabric, fabricToSolverParams, type Fabric } from './fabric/FabricLibrary'
import { exportGLB, exportOBJ } from './export/exporters3d'
import { patternToSVG, patternToDXF } from './export/patternExport'
import { garmentPatternSVG, garmentPatternDXF } from './export/garmentPattern'
import { techpackHTML, techpackJSON, type TechpackData } from './export/techpack'
import { garmentMetrics } from './export/garmentMetrics'
import { manufactureHTML, type ManufactureBundle } from './export/manufacture'
import { saveFile, openFile } from './export/save'
import { createControlPanel, type DesignMode, type ExportFormat, type GarmentState } from './ui/panel'
import { showStartPage } from './start/StartPage'
import { showHomepage } from './start/Homepage'
import { defaultConfig, type DesignConfig } from './start/design'
import { GarmentStack } from './studio/GarmentStack'
import {
  docFromConfig,
  defaultLayer,
  cloneLayer,
  gradeParams,
  serializeDoc,
  parseDoc,
  type ProjectDoc,
  type GarmentLayerData
} from './studio/document'

// ---- shared scene (built once) -------------------------------------------
const container = document.getElementById('app') as HTMLElement
const viewport = new Viewport(container)
setupEnvironment(viewport.scene, viewport.renderer)
const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)

// A garment on the clipboard (survives across studios so you can copy/paste).
let clipboard: GarmentLayerData | null = null

/** Build the full 3D studio from a design config (called after the start page). */
function initStudio(config: DesignConfig): void {
  const doc0 = docFromConfig(config)
  const l0 = doc0.layers[0]
  const bodySize = { ...doc0.body }
  const anim = { mode: doc0.scene.animMode, speed: doc0.scene.animSpeed }
  let gravity = doc0.scene.gravity
  let windX = doc0.scene.windX
  let windZ = doc0.scene.windZ
  const patternParams = { ...DEFAULT_PATTERN }
  let mode: DesignMode = 'templates'

  // The multi-garment stack (each layer = its own material · controller · fabric).
  const stack = new GarmentStack(viewport.scene, mannequin.colliders, mannequin.measurements, mannequin.bodyCollider)
  let patternCtl: PatternController | null = null

  // Panel edit buffers — always mirror the ACTIVE layer.
  const garment: GarmentState = {
    type: l0.garmentType,
    length: l0.length,
    ease: l0.ease,
    flare: l0.flare,
    neckline: l0.neckline,
    sleeve: l0.sleeve,
    size: l0.size
  }
  const current: Fabric = { ...getFabric(l0.fabricId), color: l0.color }

  stack.setGravity(gravity)
  stack.setWind(windX, windZ)
  stack.addLayer({ ...l0 })
  stack.active.image = config.image // carry a start-page upload onto the first layer
  stack.active.imageName = config.image ? 'graphic' : null
  stack.applyLook(stack.active)

  // ---- undo / redo (coarse: whole-document snapshots) ----
  const undoStack: string[] = []
  const redoStack: string[] = []
  function currentDoc(): ProjectDoc {
    return {
      version: 1,
      body: { ...bodySize },
      scene: { gravity, windX, windZ, animMode: anim.mode, animSpeed: anim.speed },
      layers: stack.toData(),
      activeIndex: stack.activeIndex
    }
  }
  function pushUndo(): void {
    undoStack.push(serializeDoc(currentDoc()))
    if (undoStack.length > 50) undoStack.shift()
    redoStack.length = 0
  }
  function undo(): void {
    if (!undoStack.length) return
    redoStack.push(serializeDoc(currentDoc()))
    applyDoc(parseDoc(undoStack.pop()!))
  }
  function redo(): void {
    if (!redoStack.length) return
    undoStack.push(serializeDoc(currentDoc()))
    applyDoc(parseDoc(redoStack.pop()!))
  }

  // ---- mode + body + scene ----
  function setBody(next: typeof bodySize): void {
    mannequin.resize(next)
    if (mode === 'templates') stack.rebuildAll()
    else patternCtl?.build(patternParams)
  }
  function setMode(m: DesignMode): void {
    mode = m
    if (m === 'templates') {
      patternCtl?.clear()
      patternCtl = null
      stack.rebuildAll()
    } else {
      stack.hideAll()
      patternCtl ??= new PatternController(
        viewport.scene,
        stack.active.material,
        mannequin.colliders,
        () => fabricToSolverParams(stack.active.fabric),
        mannequin.bodyCollider
      )
      patternCtl.setGravity(gravity)
      patternCtl.setWind(windX, windZ)
      patternCtl.build(patternParams)
    }
  }
  function setAnimMode(m: AnimationMode): void {
    anim.mode = m
    viewport.controls.autoRotate = m === 'turn'
    viewport.controls.autoRotateSpeed = anim.speed * 2.2
  }

  // Load the active layer into the panel buffers + refresh the panel controls.
  function loadActive(): void {
    const l = stack.active
    garment.type = l.data.garmentType
    garment.length = l.data.length
    garment.ease = l.data.ease
    garment.flare = l.data.flare
    garment.neckline = l.data.neckline
    garment.sleeve = l.data.sleeve
    garment.size = l.data.size
    Object.assign(current, l.fabric)
    api.refresh()
  }
  function selectLayer(i: number): void {
    stack.select(i)
    loadActive()
    api.setContext('garment')
    statusHandles?.setSelection(getGarment(stack.active.data.garmentType).name)
    centerTabs.refresh()
    syncBrowsers()
  }

  // Rebuild the whole studio from a document (undo/redo, open project).
  function applyDoc(doc: ProjectDoc): void {
    patternCtl?.clear()
    patternCtl = null
    mode = 'templates'
    stack.clear()
    Object.assign(bodySize, doc.body)
    mannequin.resize(bodySize)
    gravity = doc.scene.gravity
    windX = doc.scene.windX
    windZ = doc.scene.windZ
    anim.speed = doc.scene.animSpeed
    stack.setGravity(gravity)
    stack.setWind(windX, windZ)
    for (const ld of doc.layers) stack.addLayer({ ...ld }, false)
    stack.select(doc.activeIndex)
    setAnimMode(doc.scene.animMode)
    loadActive()
    centerTabs.refresh()
    syncBrowsers()
  }

  // ---- layer operations (add / duplicate / delete / cut / copy / paste) ----
  function addGarment(): void {
    pushUndo()
    const cat = getGarment(stack.active.data.garmentType).category
    const addType: GarmentType = cat === 'bottom' ? 'top' : 'skirt' // a sensible pairing
    stack.addLayer(defaultLayer(addType))
    loadActive()
    centerTabs.refresh()
    syncBrowsers()
  }
  function duplicateGarment(): void {
    pushUndo()
    stack.addLayer(cloneLayer(stack.active.data))
    loadActive()
    centerTabs.refresh()
    syncBrowsers()
  }
  function deleteGarment(): void {
    if (stack.size <= 1) return
    pushUndo()
    stack.removeActive()
    loadActive()
    centerTabs.refresh()
    syncBrowsers()
  }
  function copyGarment(): void {
    clipboard = cloneLayer(stack.active.data)
  }
  function cutGarment(): void {
    copyGarment()
    deleteGarment()
  }
  function pasteGarment(): void {
    if (!clipboard) return
    pushUndo()
    stack.addLayer(cloneLayer(clipboard))
    loadActive()
    centerTabs.refresh()
    syncBrowsers()
  }

  // ---- project save / open (.dio) ----
  const DIO_FILTER = [{ name: 'DesignIO project', extensions: ['dio'] }]
  async function saveProject(): Promise<void> {
    await saveFile('design.dio', serializeDoc(currentDoc()), DIO_FILTER)
  }
  async function openProject(): Promise<void> {
    const r = await openFile(DIO_FILTER)
    if (!r) return
    try {
      const doc = parseDoc(r.content)
      pushUndo()
      applyDoc(doc)
    } catch (e) {
      window.alert('Could not open project: ' + (e as Error).message)
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
      if (mode === 'templates') stack.step(dt)
      else patternCtl?.step(dt)
    },
    () => {
      if (mode === 'templates') stack.updateMeshes()
      else patternCtl?.updateMeshes()
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

  const { bodyType: bt, ...bodyScales } = bodySize
  if (bt !== 'female' || Object.values(bodyScales).some((v) => v !== 1)) setBody(bodySize)
  loop.start()

  // ---- professional studio shell (menu bar · viewport · dock · status bar) ----
  const shell = createStudioShell(() => viewport.resize())
  viewport.mount(shell.center)
  // Templates → the real per-garment flat pattern; Pattern mode → the sewn top.
  const patternSVG = (): string =>
    mode === 'templates'
      ? garmentPatternSVG(getGarment(stack.active.data.garmentType), gradeParams(stack.active.data), mannequin.measurements, mannequin.colliders)
      : patternToSVG({ bust: patternParams.bust, length: patternParams.length })
  const centerTabs = buildCenterTabs(shell.center, patternSVG)

  // ---- deep-links (snapshots) ----
  const params = new URLSearchParams(location.search)
  if (params.get('mode') === 'pattern') setMode('pattern')
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
  if (params.get('view') === 'pattern') centerTabs.show('pattern')
  const bodyRender = params.get('body')
  if (bodyRender === 'mesh') mannequin.setBodyMode(false)
  else if (bodyRender === 'glb') mannequin.setBodyMode(true)

  // ---- export ----
  function techData(): TechpackData {
    const l = stack.active
    return {
      design: mode === 'templates' ? `${l.data.garmentType} (template)` : 'Sewn top (pattern)',
      mode,
      garment:
        mode === 'templates'
          ? {
              type: l.data.garmentType,
              length: l.data.length,
              ease_cm: +(l.data.ease * 100).toFixed(1),
              flare_cm: +(l.data.flare * 100).toFixed(1)
            }
          : { bust_cm: +(patternParams.bust * 100).toFixed(1), length_cm: +(patternParams.length * 100).toFixed(1) },
      fabric: l.fabric,
      measurements: mannequin.measurements
    }
  }
  async function doExport(fmt: ExportFormat): Promise<void> {
    const meshes = mode === 'templates' ? stack.getMeshesAll() : (patternCtl?.getMeshes() ?? [])
    const dims = { bust: patternParams.bust, length: patternParams.length }
    const l = stack.active
    switch (fmt) {
      case 'glb':
        await saveFile('garment.glb', await exportGLB(meshes), [{ name: 'glTF binary', extensions: ['glb'] }])
        break
      case 'obj':
        await saveFile('garment.obj', exportOBJ(meshes), [{ name: 'Wavefront OBJ', extensions: ['obj'] }])
        break
      case 'svg': {
        const svg =
          mode === 'templates'
            ? garmentPatternSVG(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders)
            : patternToSVG(dims)
        await saveFile('pattern.svg', svg, [{ name: 'SVG', extensions: ['svg'] }])
        break
      }
      case 'dxf': {
        const dxf =
          mode === 'templates'
            ? garmentPatternDXF(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders)
            : patternToDXF(dims)
        await saveFile('pattern.dxf', dxf, [{ name: 'DXF', extensions: ['dxf'] }])
        break
      }
      case 'techpack':
        await saveFile('techpack.html', techpackHTML(techData()), [{ name: 'HTML', extensions: ['html'] }])
        break
      case 'json':
        await saveFile('design.json', techpackJSON(techData()), [{ name: 'JSON', extensions: ['json'] }])
        break
      case 'manufacture':
        await saveFile('manufacturing.html', manufactureHTML(manufactureBundle()), [{ name: 'HTML', extensions: ['html'] }])
        break
    }
  }

  // The whole outfit as a manufacturing pack (spec + BOM + flat patterns per layer).
  function activeMetrics(l = stack.active): ReturnType<typeof garmentMetrics> {
    const def = getGarment(l.data.garmentType)
    return garmentMetrics(def.name, l.data.size, def, gradeParams(l.data), mannequin.measurements, mannequin.colliders)
  }
  function manufactureBundle(): ManufactureBundle {
    return {
      title: 'DesignIO outfit',
      body: { ...bodySize },
      layers: stack.layers.map((l) => {
        const def = getGarment(l.data.garmentType)
        return {
          name: def.name,
          size: l.data.size,
          fabricName: l.fabric.name,
          gsm: l.fabric.gsm,
          color: l.data.color,
          metrics: activeMetrics(l),
          patternSVG: garmentPatternSVG(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders)
        }
      })
    }
  }

  // ---- keyboard shortcuts (ignored while typing in a field) ----
  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()
    if (mod && k === 'z') return e.preventDefault(), void (e.shiftKey ? redo() : undo())
    if (mod && k === 'y') return e.preventDefault(), void redo()
    if (mod && k === 'c') return void copyGarment()
    if (mod && k === 'x') return void cutGarment()
    if (mod && k === 'v') return void pasteGarment()
    if (mod && k === 'd') return e.preventDefault(), void duplicateGarment()
    if (mod && k === 's') return e.preventDefault(), void saveProject()
    if (mod && k === 'o') return e.preventDefault(), void openProject()
    if (e.key === 'Backspace' || e.key === 'Delete') void deleteGarment()
  }
  document.addEventListener('keydown', onKey)

  // ---- navigation out of the studio ----
  function teardown(): void {
    document.removeEventListener('keydown', onKey)
    loop.stop()
    shell.dispose()
    stack.clear()
    patternCtl?.clear()
  }
  function goBack(): void {
    teardown()
    showStartPage(FABRIC_LIBRARY, initStudio, config, openHome)
  }
  function goHome(): void {
    teardown()
    openHome()
  }

  // ---- menu bar + status bar (wired to the real actions) ----
  let simpleView = false
  buildMenuBar(shell.menubar, {
    onNew: goHome,
    onOpenProject: () => void openProject(),
    onSaveProject: () => void saveProject(),
    onExport: (fmt) => void doExport(fmt).catch((err) => console.error('Export failed', err)),
    onUndo: undo,
    onRedo: redo,
    onCut: cutGarment,
    onCopy: copyGarment,
    onPaste: pasteGarment,
    onDuplicate: duplicateGarment,
    onDelete: deleteGarment,
    onAnim: setAnimMode,
    onToggleWireframe: () => stack.setWireframe(!stack.wireframe),
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
    wireframe: { get: () => stack.wireframe, set: (v) => stack.setWireframe(v) },
    mannequin: mannequin.group,
    fabrics: FABRIC_LIBRARY,
    current,
    garment,
    patternParams,
    mode,
    onSetMode: (m) => {
      setMode(m)
      centerTabs.refresh()
    },
    onSelectFabric: (id) => {
      const base = current.color
      Object.assign(current, getFabric(id))
      current.color = base // keep the colour across a fabric swap
      Object.assign(stack.active.fabric, current)
      stack.active.data.fabricId = id
      stack.active.data.color = base
      stack.applyLook(stack.active)
      if (mode === 'templates') stack.setActivePhysics()
      else patternCtl?.setFabricPhysics()
      syncBrowsers()
    },
    onVisualEdit: () => {
      Object.assign(stack.active.fabric, current)
      stack.applyLook(stack.active)
    },
    onPhysicsEdit: () => {
      Object.assign(stack.active.fabric, current)
      if (mode === 'templates') stack.setActivePhysics()
      else patternCtl?.setFabricPhysics()
    },
    onGarmentEdit: () => {
      const l = stack.active
      l.data.garmentType = garment.type
      l.data.length = garment.length
      l.data.ease = garment.ease
      l.data.flare = garment.flare
      l.data.neckline = garment.neckline
      l.data.sleeve = garment.sleeve
      l.data.size = garment.size
      stack.rebuild(l)
      centerTabs.refresh()
      api.refreshMetrics()
      syncBrowsers()
    },
    onPatternEdit: () => {
      patternCtl?.build(patternParams)
      centerTabs.refresh()
    },
    onResew: () => patternCtl?.resew(),
    onDrop: () => (mode === 'templates' ? stack.redrapeActive() : patternCtl?.resew()),
    onSetGravity: (v) => {
      gravity = v
      stack.setGravity(v)
      patternCtl?.setGravity(v)
    },
    onSetWind: (x, z) => {
      windX = x
      windZ = z
      stack.setWind(x, z)
      patternCtl?.setWind(x, z)
    },
    onExport: (fmt) => void doExport(fmt).catch((err) => console.error('Export failed', err)),
    anim,
    onSetAnimMode: setAnimMode,
    onAnimSpeed: (v) => {
      anim.speed = v
      viewport.controls.autoRotateSpeed = v * 2.2
    },
    onColor: (h) => {
      current.color = h
      stack.active.fabric.color = h
      stack.active.data.color = h
      stack.applyLook(stack.active)
      syncBrowsers()
    },
    graphic: {
      imageName: () => stack.active.imageName,
      scale: () => stack.active.data.imageScale,
      text: () => stack.active.data.text,
      setImage: (img, name) => {
        stack.active.image = img
        stack.active.imageName = name
        stack.refreshDesign(stack.active)
      },
      setScale: (v) => {
        stack.active.data.imageScale = v
        stack.active.design?.redraw()
      },
      setText: (t) => {
        stack.active.data.text = t
        stack.refreshDesign(stack.active)
      }
    },
    getMetrics: () => activeMetrics(),
    bodySize,
    onBodySize: (b) => {
      Object.assign(bodySize, b)
      setBody(bodySize)
      centerTabs.refresh()
      api.refreshMetrics()
      syncBrowsers()
    },
    onBodyMode: (realistic) => {
      mannequin.setBodyMode(realistic)
      if (mode === 'templates') stack.redrapeAll()
      else patternCtl?.resew()
    },
    onSelectContext: (label) => statusHandles?.setSelection(label),
    onBack: goBack
  })

  // ---- Object Browser (garment layers) + docked control panel below ----
  const objBrowser = buildObjectBrowser(shell.right, {
    list: () => stack.list(),
    onSelect: selectLayer,
    onToggleVisible: (i) => {
      stack.toggleVisible(i)
      syncBrowsers()
    },
    onAdd: addGarment,
    onDuplicate: duplicateGarment,
    onDelete: deleteGarment
  })
  shell.right.appendChild(panel)

  // ---- Library (left): browse + apply to the active layer, in sync with the panel ----
  function applyPreset(p: Preset): void {
    pushUndo()
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
    const l = stack.active
    l.data.garmentType = garment.type
    l.data.length = garment.length
    l.data.ease = garment.ease
    l.data.flare = garment.flare
    l.data.neckline = garment.neckline
    l.data.sleeve = garment.sleeve
    stack.rebuild(l)
    if (c.fabricId) api.selectFabric(c.fabricId)
    if (c.color != null) {
      current.color = c.color
      l.fabric.color = c.color
      l.data.color = c.color
      stack.applyLook(l)
    }
    centerTabs.refresh()
    syncBrowsers()
  }
  const library = buildLibrary(shell.left, {
    selectGarment: (id) => {
      api.setContext('garment')
      pushUndo()
      api.selectGarment(id)
    },
    selectFabric: (id) => {
      pushUndo()
      api.selectFabric(id)
    },
    setFigure: (t) => {
      api.setContext('avatar')
      pushUndo()
      api.setFigure(t)
    },
    applyPreset,
    currentGarment: () => stack.active.data.garmentType,
    currentFabric: () => current.id,
    currentBodyType: () => bodySize.bodyType
  })
  syncBrowsers = () => {
    library.refresh()
    objBrowser.refresh()
  }

  // Deep-link extra garment layers, e.g. ?layers=skirt,long-sleeve (a layered outfit).
  const layersParam = params.get('layers')
  if (layersParam && mode === 'templates') {
    for (const id of layersParam.split(',')) {
      if (GARMENT_IDS.includes(id as GarmentType)) stack.addLayer(defaultLayer(id as GarmentType))
    }
    loadActive()
    syncBrowsers()
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
