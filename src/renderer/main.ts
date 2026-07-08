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
import { buildCenterTabs, type PatternEditor, type RenderApi } from './shell/centerTabs'
import type { Preset } from './start/presets'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin, type AnimationMode } from './avatar/Mannequin'
import { POSE_NAMES, type PoseName } from './avatar/poses'
import { getBodyPreset } from './avatar/bodyPresets'
import { Accessories, ACCESSORY_KINDS, type AccessoryKind } from './avatar/accessories'
import { SIM_RESOLUTIONS, qualityToSubsteps, type SimResolution } from './cloth/simQuality'
import { WIND_PRESET_NAMES, getWindPreset, gustWind } from './cloth/windPresets'
import { TimelinePlayer } from './studio/TimelinePlayer'
import { newKeyframeId, sampleTimeline, type Keyframe } from './studio/timeline'
import type { GarmentType, SleeveStyle, CollarStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from './garment/templates'
import { COLLAR_STYLES, SLEEVE_SHAPES, POCKET_STYLES, PLEAT_STYLES, FRILL_STYLES } from './garment/templates'
import type { NecklineStyle } from './cloth/Garment'
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
import { TEXTILE_PATTERNS, type TextilePattern } from './fabric/textile'
import { demoSwatchCanvas } from './fabric/swatch'
import { SPARKLE_KINDS, type SparkleKind } from './fabric/sparkle'
import { QUILT_PATTERNS, type QuiltPattern } from './fabric/quilt'
import { colorRefLabel } from './fabric/namedColors'
import { showHomepage } from './start/Homepage'
import { showProjectsPage } from './start/ProjectsPage'
import { loadProject, saveProjectRecord } from './studio/projectStore'
import { defaultConfig, newImagePrint, newTextPrint, type DesignConfig } from './start/design'
import { GarmentStack, type PartId } from './studio/GarmentStack'
import {
  docFromConfig,
  defaultLayer,
  cloneLayer,
  gradeParams,
  serializeDoc,
  parseDoc,
  SIZES,
  type ProjectDoc,
  type GarmentLayerData
} from './studio/document'

// ---- shared scene (built once) -------------------------------------------
const container = document.getElementById('app') as HTMLElement
const viewport = new Viewport(container)
setupEnvironment(viewport.scene, viewport.renderer)
const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)
const accessories = new Accessories()
viewport.scene.add(accessories.group)

// A garment on the clipboard (survives across studios so you can copy/paste).
let clipboard: GarmentLayerData | null = null

/** Build the full 3D studio from a design config (called after the start page). */
function initStudio(
  config: DesignConfig,
  opened?: { doc: ProjectDoc; projectId: string; projectName: string }
): void {
  const doc0 = opened?.doc ?? docFromConfig(config)
  // Bind to a library project when opened from the Projects page (else save creates one).
  let projectId: string | null = opened?.projectId ?? null
  let projectName = opened?.projectName ?? 'Untitled'
  const l0 = doc0.layers[0]
  const bodySize = { ...doc0.body }
  const anim = { mode: doc0.scene.animMode, speed: doc0.scene.animSpeed }
  let simRes: SimResolution = 'normal'
  let simQuality = 0.57 // → ~14 substeps (the default)
  let gravity = doc0.scene.gravity
  let windX = doc0.scene.windX
  let windZ = doc0.scene.windZ
  let windBaseX = windX // base wind for the gust pulse
  let windBaseZ = windZ
  let windGust = 0 // gust amplitude (0 = steady); set by a wind preset
  const patternParams = { ...DEFAULT_PATTERN }
  let mode: DesignMode = 'templates'
  let editPart: PartId = 'body' // which garment part colour/fabric edits target

  // The multi-garment stack (each layer = its own material · controller · fabric).
  const stack = new GarmentStack(viewport.scene, mannequin.colliders, mannequin.measurements, mannequin.bodyCollider, () => mannequin.anchors())
  // When the body swaps (the async GLB avatar arrives, or the toggle), re-drape every
  // garment so its pins re-bind to the new body's anchors instead of the old one's.
  mannequin.setOnBodyChange(() => stack.redrapeAll())
  let patternCtl: PatternController | null = null

  // Panel edit buffers — always mirror the ACTIVE layer.
  const garment: GarmentState = {
    type: l0.garmentType,
    length: l0.length,
    ease: l0.ease,
    flare: l0.flare,
    neckline: l0.neckline,
    sleeve: l0.sleeve,
    sleeveShape: l0.sleeveShape,
    size: l0.size,
    collar: l0.collar,
    collarStyle: l0.collarStyle,
    cuff: l0.cuff,
    pleats: l0.pleats,
    pleatStyle: l0.pleatStyle,
    dart: l0.dart,
    pocket: l0.pocket,
    pocketStyle: l0.pocketStyle,
    hem: l0.hem,
    closure: l0.closure,
    lined: l0.lined,
    interfaced: l0.interfaced,
    waistband: l0.waistband,
    facing: l0.facing,
    drawstring: l0.drawstring,
    ruffles: l0.ruffles,
    frillStyle: l0.frillStyle,
    boning: l0.boning,
    ribbing: l0.ribbing,
    yoke: l0.yoke,
    princess: l0.princess,
    seam: l0.seam,
    notches: l0.notches,
    trim: l0.trim
  }
  const current: Fabric = { ...getFabric(l0.fabricId), color: l0.color }

  stack.setGravity(gravity)
  stack.setWind(windX, windZ)
  stack.addLayer({ ...l0 })
  if (!opened) stack.active.prints = config.prints.map((p) => ({ ...p })) // carry start-page prints (with images)
  stack.applyLook(stack.active)
  // ?swatch=demo — exercise the fabric-photo → tiling-PBR pipeline with a procedural swatch
  if (new URLSearchParams(location.search).get('swatch') === 'demo') stack.setSwatch(stack.active, demoSwatchCanvas())

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
  let uiPose: PoseName = 'stand' // the current static pose (for timeline keyframe capture)
  function setPose(name: PoseName): void {
    uiPose = name
    setAnimMode('static') // lookbook poses are static stances
    mannequin.setPose(name) // applies the pose + re-settles garments (via onBodyChange)
  }
  /** The avatar's current subject — a live idle/walk mode, else the static pose. */
  const currentSubject = (): Keyframe['subject'] => (anim.mode === 'walk' ? 'walk' : anim.mode === 'idle' ? 'idle' : uiPose)

  // ---- animation timeline (shot sequencer + WebM record) ----
  let timelineNotify: (() => void) | null = null
  const player = new TimelinePlayer({
    applyCamera: (c) => viewport.setCameraPose(c),
    applySubject: (s) => (s === 'idle' || s === 'walk' ? setAnimMode(s) : setPose(s)),
    onFrame: (_t, _total, playing) => {
      // Hand the camera to the timeline during playback (no user damping/orbit fighting it).
      viewport.controls.enableDamping = !playing
      viewport.controls.enabled = !playing
      timelineNotify?.()
    }
  })

  // Load the active layer into the panel buffers + refresh the panel controls.
  function loadActive(): void {
    const l = stack.active
    garment.type = l.data.garmentType
    garment.length = l.data.length
    garment.ease = l.data.ease
    garment.flare = l.data.flare
    garment.neckline = l.data.neckline
    garment.sleeve = l.data.sleeve
    garment.sleeveShape = l.data.sleeveShape
    garment.size = l.data.size
    garment.collar = l.data.collar
    garment.collarStyle = l.data.collarStyle
    garment.cuff = l.data.cuff
    garment.pleats = l.data.pleats
    garment.pleatStyle = l.data.pleatStyle
    garment.dart = l.data.dart
    garment.pocket = l.data.pocket
    garment.pocketStyle = l.data.pocketStyle
    garment.hem = l.data.hem
    garment.closure = l.data.closure
    garment.lined = l.data.lined
    garment.interfaced = l.data.interfaced
    garment.waistband = l.data.waistband
    garment.facing = l.data.facing
    garment.drawstring = l.data.drawstring
    garment.ruffles = l.data.ruffles
    garment.frillStyle = l.data.frillStyle
    garment.boning = l.data.boning
    garment.ribbing = l.data.ribbing
    garment.yoke = l.data.yoke
    garment.princess = l.data.princess
    garment.seam = l.data.seam
    garment.notches = l.data.notches
    garment.trim = l.data.trim
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

  // ---- projects: library save + .dio import/export ----
  const DIO_FILTER = [{ name: 'DesignIO project', extensions: ['dio'] }]
  /** A small JPEG dataURL of the current viewport (best-effort) for the Projects gallery. */
  function captureThumb(): string | undefined {
    try {
      viewport.render() // ensure the buffer is fresh before reading it
      const src = viewport.renderer.domElement
      const w = 320
      const h = Math.round((w * src.height) / src.width) || 220
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return undefined
      ctx.drawImage(src, 0, 0, w, h)
      return c.toDataURL('image/jpeg', 0.6)
    } catch {
      return undefined
    }
  }
  /** Save into the in-app library (upsert; prompts for a name the first time). */
  function saveProject(): void {
    if (!projectId) {
      const name = window.prompt('Name this project', projectName === 'Untitled' ? stack.active.data.garmentType : projectName)
      if (!name || !name.trim()) return
      projectName = name.trim()
    }
    projectId = saveProjectRecord({ id: projectId ?? undefined, name: projectName, doc: currentDoc(), thumb: captureThumb() })
    statusHandles?.setSelection(`Saved “${projectName}”`)
  }
  /** Export the current project to a portable .dio file. */
  async function exportDio(): Promise<void> {
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'design'
    await saveFile(`${safe}.dio`, serializeDoc(currentDoc()), DIO_FILTER)
  }
  /** Import a .dio file into the current studio (replaces the scene). */
  async function openProject(): Promise<void> {
    const r = await openFile(DIO_FILTER)
    if (!r) return
    try {
      const doc = parseDoc(r.content)
      pushUndo()
      applyDoc(doc)
      projectId = null // an imported file becomes a new library entry on next save
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
      if (windGust > 0) {
        const w = gustWind(windBaseX, windBaseZ, windGust, simTime) // pulse the wind (gust/breeze)
        stack.setWind(w.x, w.z)
        patternCtl?.setWind(w.x, w.z)
      }
      player.tick(dt) // timeline playback drives the camera + avatar subject
      mannequin.update(simTime, anim.mode, anim.speed)
      accessories.update(mannequin.colliders) // shoes/belt/hat/bag follow the live body
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
      ? garmentPatternSVG(getGarment(stack.active.data.garmentType), gradeParams(stack.active.data), mannequin.measurements, mannequin.colliders, stack.active.prints)
      : patternToSVG({ bust: patternParams.bust, length: patternParams.length })

  // Persist the edit buffer → active layer, rebuild + refresh everywhere. Shared by
  // the 3D Property Editor AND the 2D pattern tools, so 2D and 3D drive one design.
  function applyGarmentEdit(): void {
    const l = stack.active
    l.data.garmentType = garment.type
    l.data.length = garment.length
    l.data.ease = garment.ease
    l.data.flare = garment.flare
    l.data.neckline = garment.neckline
    l.data.sleeve = garment.sleeve
    l.data.sleeveShape = garment.sleeveShape
    l.data.size = garment.size
    l.data.collar = garment.collar
    l.data.collarStyle = garment.collarStyle
    l.data.cuff = garment.cuff
    l.data.pleats = garment.pleats
    l.data.pleatStyle = garment.pleatStyle
    l.data.dart = garment.dart
    l.data.pocket = garment.pocket
    l.data.pocketStyle = garment.pocketStyle
    l.data.hem = garment.hem
    l.data.closure = garment.closure
    l.data.lined = garment.lined
    l.data.interfaced = garment.interfaced
    l.data.waistband = garment.waistband
    l.data.facing = garment.facing
    l.data.drawstring = garment.drawstring
    l.data.ruffles = garment.ruffles
    l.data.frillStyle = garment.frillStyle
    l.data.boning = garment.boning
    l.data.ribbing = garment.ribbing
    l.data.yoke = garment.yoke
    l.data.princess = garment.princess
    l.data.seam = garment.seam
    l.data.notches = garment.notches
    l.data.trim = garment.trim
    stack.rebuild(l)
    centerTabs.refresh()
    api.refreshMetrics()
    syncBrowsers()
  }
  const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
  // Editing from the 2D pane → same edit path, then re-sync the 3D panel controls.
  const editFrom2D = (mut: () => void): void => {
    mut()
    applyGarmentEdit()
    api.refresh()
  }
  const NECKS: NecklineStyle[] = ['scoop', 'crew', 'v', 'strapless']
  const SLEEVES: SleeveStyle[] = ['none', 'short', 'long']
  const cycle = <T,>(list: T[], cur: T, d: number): T => list[((list.indexOf(cur) + d) % list.length + list.length) % list.length]
  const patternEditor: PatternEditor = {
    length: () => garment.length,
    ease: () => garment.ease,
    flare: () => garment.flare,
    size: () => garment.size,
    neckline: () => garment.neckline,
    sleeve: () => garment.sleeve,
    supports: () => {
      const s = getGarment(garment.type).supports
      return { length: !!s.length, ease: !!s.ease, flare: !!s.flare, neckline: !!s.neckline, sleeve: !!s.sleeve }
    },
    nudgeLength: (d) => editFrom2D(() => (garment.length = clampN(garment.length + d, 0, 1))),
    nudgeEase: (d) => editFrom2D(() => (garment.ease = clampN(garment.ease + d, 0, 0.12))),
    nudgeFlare: (d) => editFrom2D(() => (garment.flare = clampN(garment.flare + d, 0, 0.22))),
    nudgeSize: (d) => editFrom2D(() => (garment.size = SIZES[clampN(SIZES.indexOf(garment.size) + d, 0, SIZES.length - 1)])),
    nudgeNeckline: (d) => editFrom2D(() => (garment.neckline = cycle(NECKS, garment.neckline, d))),
    nudgeSleeve: (d) => editFrom2D(() => (garment.sleeve = cycle(SLEEVES, garment.sleeve, d)))
  }
  // Render tab: supersample the current view to a PNG + save it to disk.
  const renderApi: RenderApi = {
    capture: (width) => viewport.renderStill(width),
    save: async (dataUrl) => {
      const b64 = dataUrl.split(',')[1] ?? ''
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'render'
      await saveFile(`${safe}.png`, bytes, [{ name: 'PNG image', extensions: ['png'] }])
    }
  }
  const centerTabs = buildCenterTabs(shell.center, patternSVG, patternEditor, renderApi)

  // ---- deep-links (snapshots) ----
  const params = new URLSearchParams(location.search)
  if (params.get('mode') === 'pattern') setMode('pattern')
  const animParam = params.get('anim') as AnimationMode | null
  if (animParam) setAnimMode(animParam)
  const poseParam = params.get('pose')
  if (poseParam && (POSE_NAMES as string[]).includes(poseParam)) setPose(poseParam as PoseName)
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
  const bpParam = params.get('bodyPreset')
  if (bpParam) {
    const preset = getBodyPreset(bpParam)
    if (preset) {
      Object.assign(bodySize, preset.shape)
      bodyChanged = true
    }
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
  if (params.get('view') === 'render') centerTabs.show('render')
  const bodyRender = params.get('body')
  if (bodyRender === 'mesh') mannequin.setBodyMode(false)
  else if (bodyRender === 'glb') mannequin.setBodyMode(true)
  if (params.get('heatmap') === '1') stack.setHeatmap(true)
  if (params.get('stress') === '1') stack.setStress(true)
  if (params.get('wrinkles') === '1') stack.setWrinkles(true)
  const windParam = params.get('wind')
  if (windParam && WIND_PRESET_NAMES.includes(windParam)) {
    const p = getWindPreset(windParam)!
    windX = windBaseX = p.x
    windZ = windBaseZ = p.z
    windGust = p.gust
    stack.setWind(p.x, p.z)
  }
  const accParam = params.get('accessories')
  if (accParam) for (const k of accParam.split(',')) if ((ACCESSORY_KINDS as string[]).includes(k.trim())) accessories.setEnabled(k.trim() as AccessoryKind, true)
  const srParam = params.get('simRes')
  if (srParam && SIM_RESOLUTIONS.some((r) => r.name === srParam)) {
    simRes = srParam as SimResolution
    stack.setSimResolution(simRes)
  }
  const sqParam = params.get('simQuality')
  if (sqParam) {
    simQuality = Math.max(0, Math.min(1, +sqParam))
    stack.setSimQuality(qualityToSubsteps(simQuality))
  }

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
            ? garmentPatternSVG(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders, l.prints)
            : patternToSVG(dims)
        await saveFile('pattern.svg', svg, [{ name: 'SVG', extensions: ['svg'] }])
        break
      }
      case 'dxf': {
        const dxf =
          mode === 'templates'
            ? garmentPatternDXF(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders, l.prints)
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
        const parts: { part: string; fabric: string }[] = []
        if (l.data.partFabrics?.sleeves) parts.push({ part: 'sleeves', fabric: getFabric(l.data.partFabrics.sleeves.fabricId).name })
        if (l.data.partFabrics?.legs) parts.push({ part: 'legs', fabric: getFabric(l.data.partFabrics.legs.fabricId).name })
        if (l.data.partFabrics?.back) parts.push({ part: 'back', fabric: getFabric(l.data.partFabrics.back.fabricId).name })
        if (l.data.partFabrics?.legBack) parts.push({ part: 'legs back', fabric: getFabric(l.data.partFabrics.legBack.fabricId).name })
        return {
          name: def.name,
          size: l.data.size,
          fabricName: l.fabric.name,
          gsm: l.fabric.gsm,
          color: l.data.color,
          colorRef: colorRefLabel(l.data.color),
          parts: parts.length ? parts : undefined,
          trim: l.data.trim ? getFabric(l.data.trimFabricId ?? l.data.fabricId).name : undefined,
          seam: l.data.seam ?? 10,
          metrics: activeMetrics(l),
          patternSVG: garmentPatternSVG(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders, l.prints)
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
  // "← Start / Projects": opened from a project → back to the Projects gallery;
  // opened from the builder → back to "Design your piece" keeping this design.
  function goBack(): void {
    teardown()
    if (opened) openProjects()
    else showStartPage(FABRIC_LIBRARY, initStudio, config, openHome)
  }
  function goHome(): void {
    teardown()
    openHome()
  }
  function goProjects(): void {
    teardown()
    openProjects()
  }

  // ---- menu bar + status bar (wired to the real actions) ----
  let simpleView = false
  buildMenuBar(shell.menubar, {
    onNew: goHome,
    onProjects: goProjects,
    onSaveProject: saveProject,
    onExportDio: () => void exportDio().catch((err) => console.error('Export failed', err)),
    onOpenProject: () => void openProject(),
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
    onSelectPart: (p) => {
      editPart = p
      current.color = stack.partData(p).color // show the part's colour in the picker
      api.refresh()
    },
    onSelectFabric: (id) => {
      if (editPart !== 'body') {
        stack.setPart(editPart, { fabricId: id })
        syncBrowsers()
        return
      }
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
    onGarmentEdit: applyGarmentEdit,
    onPatternEdit: () => {
      patternCtl?.build(patternParams)
      centerTabs.refresh()
    },
    onResew: () => patternCtl?.resew(),
    onDrop: () => (mode === 'templates' ? stack.redrapeActive() : patternCtl?.resew()),
    heatmap: { get: () => stack.heatmap, set: (on) => stack.setHeatmap(on) },
    stress: { get: () => stack.stress, set: (on) => stack.setStress(on) },
    wrinkles: { get: () => stack.wrinkles, set: (on) => stack.setWrinkles(on) },
    accessories: { get: (k) => accessories.isEnabled(k), set: (k, on) => accessories.setEnabled(k, on) },
    sim: {
      resolution: { get: () => simRes, set: (r) => { simRes = r; stack.setSimResolution(r) } },
      quality: { get: () => simQuality, set: (t) => { simQuality = t; stack.setSimQuality(qualityToSubsteps(t)) } }
    },
    onSetGravity: (v) => {
      gravity = v
      stack.setGravity(v)
      patternCtl?.setGravity(v)
    },
    onSetWind: (x, z) => {
      windX = windBaseX = x
      windZ = windBaseZ = z
      windGust = 0 // a manual wind is steady (a preset re-enables gusting)
      stack.setWind(x, z)
      patternCtl?.setWind(x, z)
    },
    onSetWindPreset: (name) => {
      const p = getWindPreset(name)
      if (!p) return
      windX = windBaseX = p.x
      windZ = windBaseZ = p.z
      windGust = p.gust
      stack.setWind(p.x, p.z)
      patternCtl?.setWind(p.x, p.z)
      return { x: p.x, z: p.z }
    },
    onExport: (fmt) => void doExport(fmt).catch((err) => console.error('Export failed', err)),
    anim,
    onSetAnimMode: setAnimMode,
    onSetPose: setPose,
    timeline: {
      list: () => {
        const active = sampleTimeline(player.keyframes, player.time)?.index ?? -1
        return player.keyframes.map((k, i) => ({ id: k.id, subject: k.subject, duration: k.duration, active: i === active }))
      },
      add: () => {
        player.keyframes.push({ id: newKeyframeId(), camera: viewport.getCameraPose(), subject: currentSubject(), duration: 2 })
        timelineNotify?.()
      },
      remove: (id) => {
        player.keyframes = player.keyframes.filter((k) => k.id !== id)
        timelineNotify?.()
      },
      setDuration: (id, s) => {
        const k = player.keyframes.find((k) => k.id === id)
        if (k) k.duration = Math.max(0.1, s)
        timelineNotify?.()
      },
      transport: (a) => (a === 'play' ? player.play() : a === 'pause' ? player.pause() : player.stop()),
      toggleLoop: () => (player.loop = !player.loop),
      seek: (t) => player.seek(t),
      record: () => {
        player
          .record(viewport.renderer.domElement)
          .then((blob) => {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'designio-clip.webm'
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 8000)
          })
          .catch((err) => window.alert('Record failed: ' + (err as Error).message))
      },
      state: () => ({ playing: player.playing, loop: player.loop, time: player.time, total: player.total }),
      subscribe: (cb) => (timelineNotify = cb)
    },
    onAnimSpeed: (v) => {
      anim.speed = v
      viewport.controls.autoRotateSpeed = v * 2.2
    },
    onColor: (h) => {
      current.color = h
      if (editPart !== 'body') {
        stack.setPart(editPart, { color: h })
        syncBrowsers()
        return
      }
      stack.active.fabric.color = h
      stack.active.data.color = h
      stack.applyLook(stack.active)
      syncBrowsers()
    },
    prints: {
      list: () => stack.active.prints.map((p) => ({ id: p.id, kind: p.kind, label: p.kind === 'image' ? (p.imageName ?? 'logo') : p.text || 'text' })),
      get: (id) => {
        const p = stack.active.prints.find((q) => q.id === id)
        return p ? { kind: p.kind, x: p.x, y: p.y, scale: p.scale, rotation: p.rotation, text: p.text, color: p.color, part: p.part, style: p.style } : null
      },
      addImage: (image, name) => {
        const p = newImagePrint(image, name)
        stack.active.prints.push(p)
        stack.refreshDesign(stack.active)
        return p.id
      },
      addText: () => {
        const p = newTextPrint('TEXT')
        stack.active.prints.push(p)
        stack.refreshDesign(stack.active)
        return p.id
      },
      update: (id, patch) => {
        const p = stack.active.prints.find((q) => q.id === id)
        if (p) {
          Object.assign(p, patch)
          stack.refreshDesign(stack.active)
        }
      },
      remove: (id) => {
        stack.active.prints = stack.active.prints.filter((q) => q.id !== id)
        stack.refreshDesign(stack.active)
      }
    },
    textile: {
      get: () => stack.active.data.textile,
      set: (t) => {
        stack.active.data.textile = t
        stack.refreshDesign(stack.active)
      }
    },
    swatch: {
      active: () => stack.active.swatch != null,
      set: (img) => stack.setSwatch(stack.active, img),
      clear: () => stack.clearSwatch(stack.active)
    },
    sparkle: {
      get: () => stack.active.data.sparkle,
      set: (k) => {
        stack.active.data.sparkle = k
        stack.applyLook(stack.active)
      }
    },
    quilt: {
      get: () => stack.active.data.quilt,
      set: (p) => {
        stack.active.data.quilt = p
        stack.applyLook(stack.active)
      }
    },
    colorways: {
      list: () =>
        stack.colorways().map((cw) => ({
          id: cw.id,
          name: cw.name,
          color: cw.color,
          tag: [cw.textile, cw.sparkle, cw.quilt, cw.trim ? 'trim' : undefined].filter(Boolean).join(' · ') || undefined
        })),
      add: () => {
        pushUndo()
        stack.saveColorway(getFabric(stack.active.data.fabricId).name)
      },
      apply: (id) => {
        pushUndo()
        stack.useColorway(id)
        loadActive() // reflect the new colour/fabric/finishes across the panel
        centerTabs.refresh()
        api.refreshMetrics()
        syncBrowsers()
      },
      remove: (id) => {
        pushUndo()
        stack.deleteColorway(id)
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

// ---- the app launcher (Homepage → start page / projects → studio) -----
function openHome(): void {
  showHomepage({
    onNewDesign: () => showStartPage(FABRIC_LIBRARY, initStudio, undefined, openHome),
    // Templates open the preview pre-filled (Homepage → Preview → Studio), so the
    // route is consistent and you can tweak before entering 3D.
    onTemplate: (cfg) => showStartPage(FABRIC_LIBRARY, initStudio, cfg, openHome),
    onProjects: openProjects
  })
}

// ---- the Projects gallery (open a saved design straight into the studio) -----
function openProjects(): void {
  showProjectsPage({
    onOpen: (id) => {
      const rec = loadProject(id)
      if (rec) initStudio(defaultConfig(), { doc: rec.doc, projectId: rec.id, projectName: rec.name })
    },
    onNewDesign: () => showStartPage(FABRIC_LIBRARY, initStudio, undefined, openHome),
    onHome: openHome
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
  if (txt) {
    const p = newTextPrint(txt) // lets snapshots exercise the printed-design map
    const px = entryParams.get('textX')
    const py = entryParams.get('textY')
    if (px) p.x = +px // 0…1 across the garment (0.25 front centre, 0.75 back centre)
    if (py) p.y = +py
    cfg.prints.push(p)
  }
  if (entryParams.get('prints') === 'demo') {
    cfg.prints.push({ ...newTextPrint('TEAM'), x: 0.25, y: 0.36, scale: 0.5, color: 0xffffff })
    cfg.prints.push({ ...newTextPrint('2026'), x: 0.25, y: 0.52, scale: 0.3, rotation: -8, color: 0xffffff })
  }
  if (entryParams.get('prints') === 'parts') {
    // one print per piece — exercises prints on the body, sleeves + legs
    cfg.prints.push({ ...newTextPrint('BODY'), x: 0.25, y: 0.32, scale: 0.45, color: 0xffffff, part: 'body' })
    cfg.prints.push({ ...newTextPrint('ARM'), x: 0.25, y: 0.5, scale: 0.6, color: 0xffffff, part: 'sleeves' })
    cfg.prints.push({ ...newTextPrint('LEG'), x: 0.25, y: 0.4, scale: 0.6, color: 0xffffff, part: 'legs' })
  }
  if (entryParams.get('prints') === 'embroidery') {
    cfg.prints.push({ ...newTextPrint('LUXE'), x: 0.25, y: 0.34, scale: 0.55, color: 0xf0c674, style: 'embroidery' })
  }
  if (entryParams.get('prints') === 'applique') {
    cfg.prints.push({ ...newTextPrint('STAR'), x: 0.25, y: 0.36, scale: 0.5, color: 0xd94f6a, style: 'applique' })
  }
  if (entryParams.get('collar')) cfg.collar = true
  const cs = entryParams.get('collarStyle')
  if (cs && (COLLAR_STYLES as string[]).includes(cs)) {
    cfg.collar = true
    cfg.collarStyle = cs as CollarStyle
  }
  const ss = entryParams.get('sleeveShape')
  if (ss && (SLEEVE_SHAPES as string[]).includes(ss)) cfg.sleeveShape = ss as SleeveShape
  if (entryParams.get('cuff')) cfg.cuff = true
  if (entryParams.get('pleats')) cfg.pleats = true
  const pl = entryParams.get('pleatStyle')
  if (pl && (PLEAT_STYLES as string[]).includes(pl)) { cfg.pleats = true; cfg.pleatStyle = pl as PleatStyle }
  if (entryParams.get('dart')) cfg.dart = true
  if (entryParams.get('pocket')) cfg.pocket = true
  const ps = entryParams.get('pocketStyle')
  if (ps && (POCKET_STYLES as string[]).includes(ps)) {
    cfg.pocket = true
    cfg.pocketStyle = ps as PocketStyle
  }
  if (entryParams.get('hem')) cfg.hem = true
  if (entryParams.get('closure')) cfg.closure = true
  if (entryParams.get('lined')) cfg.lined = true
  if (entryParams.get('interfaced')) cfg.interfaced = true
  if (entryParams.get('waistband')) cfg.waistband = true
  if (entryParams.get('facing')) cfg.facing = true
  if (entryParams.get('drawstring')) cfg.drawstring = true
  if (entryParams.get('ruffles')) cfg.ruffles = true
  if (entryParams.get('boning')) cfg.boning = true
  if (entryParams.get('ribbing')) cfg.ribbing = true
  if (entryParams.get('yoke')) cfg.yoke = true
  if (entryParams.get('princess')) cfg.princess = true
  const tx = entryParams.get('textile')
  if (tx && (TEXTILE_PATTERNS as string[]).includes(tx)) cfg.textile = tx as TextilePattern
  const spk = entryParams.get('sparkle')
  if (spk && (SPARKLE_KINDS as string[]).includes(spk)) cfg.sparkle = spk as SparkleKind
  const qlt = entryParams.get('quilt')
  if (qlt && (QUILT_PATTERNS as string[]).includes(qlt)) cfg.quilt = qlt as QuiltPattern
  const fr = entryParams.get('frillStyle')
  if (fr && (FRILL_STYLES as string[]).includes(fr)) { cfg.ruffles = true; cfg.frillStyle = fr as FrillStyle }
  if (entryParams.get('trim')) cfg.trim = true
  const tc = entryParams.get('trimColor')
  if (tc) cfg.trimColor = parseInt(tc, 16)
  const sf = entryParams.get('sleeveFabric')
  if (sf) (cfg.partFabrics ??= {}).sleeves = { fabricId: sf, color: getFabric(sf).color }
  const lf = entryParams.get('legFabric')
  if (lf) (cfg.partFabrics ??= {}).legs = { fabricId: lf, color: getFabric(lf).color }
  const bf = entryParams.get('backFabric')
  if (bf) (cfg.partFabrics ??= {}).back = { fabricId: bf, color: getFabric(bf).color }
  const lbf = entryParams.get('legBackFabric')
  if (lbf) (cfg.partFabrics ??= {}).legBack = { fabricId: lbf, color: getFabric(lbf).color }
  initStudio(cfg)
} else if (entryParams.get('page') === 'start') {
  showStartPage(FABRIC_LIBRARY, initStudio, undefined, openHome) // deep-link to the builder
} else if (entryParams.get('page') === 'projects') {
  if (entryParams.get('demo')) seedDemoProjects() // populate a few looks for a snapshot
  openProjects()
} else {
  openHome()
}

/** Seed a few example projects (only if the library is empty) — for demos/snapshots. */
function seedDemoProjects(): void {
  if (loadProject('__probe__') || (typeof localStorage !== 'undefined' && localStorage.getItem('dio-projects-v1'))) return
  const looks: [string, GarmentType, string][] = [
    ['Linen sundress', 'dress', 'linen'],
    ['Satin gown', 'gown', 'satin'],
    ['Denim jumpsuit', 'jumpsuit', 'denim'],
    ['Wool wide-leg', 'wide-leg', 'wool-flannel']
  ]
  for (const [name, g, fabric] of looks) {
    const cfg = defaultConfig()
    cfg.garmentType = g
    Object.assign(cfg, getGarment(g).defaults)
    cfg.fabricId = fabric
    cfg.color = getFabric(fabric).color
    saveProjectRecord({ name, doc: docFromConfig(cfg) })
  }
}
