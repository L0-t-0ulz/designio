import '@fontsource-variable/inter'
import './ui/tokens.css'
import './ui/styles.css'
import './ui/shell.css'
import { Viewport } from './core/Viewport'
import { createStudioShell } from './shell/StudioShell'
import { buildMenuBar } from './shell/menuBar'
import { showToast } from './ui/toast'
import { rafCoalesce } from './core/coalesce'
import { toggleShortcuts, closeShortcuts, shortcutsOpen } from './ui/shortcutsOverlay'
import { KEY_ACTIONS, actionFor, keymap, type KeyAction } from './ui/keymap'
import { startTour, closeTour, tourOpen, hasSeenTour } from './ui/onboardingTour'
import { buildStatusBar, type StatusHandles } from './shell/statusBar'
import { buildLibrary } from './shell/library'
import { buildObjectBrowser } from './shell/objectBrowser'
import { buildCenterTabs, type PatternEditor, type RenderApi } from './shell/centerTabs'
import type { Preset } from './start/presets'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { buildMannequin, type AnimationMode } from './avatar/Mannequin'
import { skinLook, SKIN_LOOK, SKIN_TONES, UNDERTONES, type SkinTone, type Undertone } from './avatar/skin'
import { POSE_NAMES, type PoseName } from './avatar/poses'
import { getBodyPreset } from './avatar/bodyPresets'
import { Accessories, ACCESSORY_KINDS, type AccessoryKind } from './avatar/accessories'
import { FaceRig, HAIRSTYLES, type Hairstyle } from './avatar/face'
import { SIM_RESOLUTIONS, qualityToSubsteps, type SimResolution } from './cloth/simQuality'
import { WIND_PRESET_NAMES, getWindPreset, gustWind } from './cloth/windPresets'
import { TimelinePlayer } from './studio/TimelinePlayer'
import { newKeyframeId, sampleTimeline, type Keyframe } from './studio/timeline'
import { MeasureTool, type MeasureMode } from './studio/MeasureTool'
import { parsePatternDXF, importedPatternToSVG, patternSummary, type ImportedPattern } from './export/patternImport'
import { lineupCells, lineupHues } from './studio/lineup'
import { batchRenderPlan } from './studio/batchRender'
import type { GarmentType, SleeveStyle, CollarStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from './garment/templates'
import { COLLAR_STYLES, SLEEVE_SHAPES, POCKET_STYLES, PLEAT_STYLES, FRILL_STYLES } from './garment/templates'
import type { NecklineStyle } from './cloth/Garment'
import { GARMENT_IDS, getGarment } from './garments/registry'
import { PatternController } from './pattern/PatternController'
import { DEFAULT_PATTERN } from './pattern/pattern'
import { FABRIC_LIBRARY, getFabric, fabricToSolverParams, estimatedFabricPrice, type Fabric } from './fabric/FabricLibrary'
import { exportGLB, exportOBJ, exportUSDZ } from './export/exporters3d'
import { recordTurntable } from './studio/turntable'
import { patternToSVG, patternToDXF } from './export/patternExport'
import { garmentPatternSVG, garmentPatternDXF, garmentToPanels } from './export/garmentPattern'
import { tiledPatternHTML } from './export/tiledPrint'
import { techpackHTML, techpackJSON, type TechpackData } from './export/techpack'
import { garmentMetrics } from './export/garmentMetrics'
import { manufactureHTML, type ManufactureBundle } from './export/manufacture'
import { pomTable } from './export/pom'
import { nestMarker } from './export/marker'
import { costRollup, estimateLabourMinutes } from './export/cost'
import { threadMetres } from './export/thread'
import { drapedGirths } from './export/drapeFit'
import { careLabel, careInstructions } from './export/careLabel'
import { careSymbols } from './export/careSymbols'
import { saveFile, openFile } from './export/save'
import { createControlPanel, type DesignMode, type ExportFormat, type GarmentState } from './ui/panel'
import { showStartPage } from './start/StartPage'
import { TEXTILE_PATTERNS, type TextilePattern } from './fabric/textile'
import { OMBRE_DIRECTIONS, type OmbreDirection } from './fabric/ombre'
import { WEAR_KINDS, type WearKind } from './fabric/wear'
import { demoSwatchCanvas } from './fabric/swatch'
import { SPARKLE_KINDS, type SparkleKind } from './fabric/sparkle'
import { IRIDESCENT_KINDS, type IridescentKind } from './fabric/iridescent'
import { QUILT_PATTERNS, type QuiltPattern } from './fabric/quilt'
import { LACE_PATTERNS, type LacePattern } from './fabric/lace'
import { FUR_KINDS, type FurKind } from './fabric/fur'
import { colorRefLabel } from './fabric/namedColors'
import { showHomepage } from './start/Homepage'
import { showProjectsPage } from './start/ProjectsPage'
import { loadProject, saveProjectRecord, snapshotProject, listSnapshots, restoreSnapshot, deleteSnapshot } from './studio/projectStore'
import { openVersionHistory } from './ui/versionHistory'
import { listBookmarks, saveBookmark, deleteBookmark } from './studio/cameraBookmarks'
import { openCameraBookmarks } from './ui/cameraBookmarksPanel'
import { writeAutosave, readAutosave, clearAutosave, shouldOfferRestore, describeAge } from './studio/autosave'
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
const env = setupEnvironment(viewport.scene, viewport.renderer)
const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)
const accessories = new Accessories()
viewport.scene.add(accessories.group)
const faceRig = new FaceRig() // hair + face features, worn on the head
viewport.scene.add(faceRig.group)

// A garment on the clipboard (survives across studios so you can copy/paste).
let clipboard: GarmentLayerData | null = null
// Autosave timer/handler for the current studio (cleared when a new studio mounts).
let autosaveTimer: ReturnType<typeof setInterval> | undefined
let autosaveHandler: (() => void) | undefined

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
  let importedPattern: ImportedPattern | null = null // an imported DXF shown in the 2D pane
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
    gradeRules: l0.gradeRules,
    collar: l0.collar,
    collarStyle: l0.collarStyle,
    cuff: l0.cuff,
    pleats: l0.pleats,
    pleatStyle: l0.pleatStyle,
    crease: l0.crease,
    trouserBreak: l0.trouserBreak,
    fringe: l0.fringe,
    dart: l0.dart,
    pocket: l0.pocket,
    pocketStyle: l0.pocketStyle,
    hem: l0.hem,
    closure: l0.closure,
    closureOpen: l0.closureOpen,
    lined: l0.lined,
    interfaced: l0.interfaced,
    wet: l0.wet,
    puff: l0.puff,
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
  // Apply the avatar's complexion (skin tone + undertone) — cheap material update,
  // separate from the geometry resize path. Undefined tone = the default warm skin.
  function applySkin(): void {
    mannequin.setSkinTone(bodySize.skinTone ? skinLook(bodySize.skinTone, bodySize.undertone ?? 'warm') : SKIN_LOOK)
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
    viewport.controls.autoRotateSpeed = anim.speed * 4 // ~15 s per orbit at speed 1 (steady, frame-rate-independent)
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
    garment.gradeRules = l.data.gradeRules
    garment.collar = l.data.collar
    garment.collarStyle = l.data.collarStyle
    garment.cuff = l.data.cuff
    garment.pleats = l.data.pleats
    garment.pleatStyle = l.data.pleatStyle
    garment.crease = l.data.crease
    garment.trouserBreak = l.data.trouserBreak
    garment.fringe = l.data.fringe
    garment.dart = l.data.dart
    garment.pocket = l.data.pocket
    garment.pocketStyle = l.data.pocketStyle
    garment.hem = l.data.hem
    garment.closure = l.data.closure
    garment.closureOpen = l.data.closureOpen
    garment.lined = l.data.lined
    garment.interfaced = l.data.interfaced
    garment.wet = l.data.wet
    garment.puff = l.data.puff
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
    importedPattern = null // a fresh doc → the live pattern, not a stale import
    patternCtl?.clear()
    patternCtl = null
    mode = 'templates'
    stack.clear()
    Object.assign(bodySize, doc.body)
    mannequin.resize(bodySize)
    applySkin()
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
    clearAutosave() // work is saved — nothing to recover until the next edit
    statusHandles?.setSelection(`Saved “${projectName}”`)
  }
  /** Snapshot the current doc into the project's version history (saves first if new). */
  function saveVersion(): void {
    if (!projectId) saveProject()
    if (!projectId) return // save was cancelled
    snapshotProject(projectId, new Date().toLocaleString(), currentDoc())
    showToast('Saved a version', 'success')
  }
  /** Open the version-history panel — restore or delete a saved snapshot. */
  function openHistory(): void {
    if (!projectId) {
      showToast('Save the project first to keep versions', 'info')
      return
    }
    const pid = projectId
    openVersionHistory({
      items: listSnapshots(pid),
      onSaveVersion: saveVersion,
      onRestore: (snapId) => {
        const doc = restoreSnapshot(pid, snapId)
        if (!doc) return
        pushUndo()
        applyDoc(doc)
        showToast('Restored version', 'success')
      },
      onDelete: (snapId) => deleteSnapshot(pid, snapId)
    })
  }
  // Autosave the working doc to localStorage (crash recovery). Best-effort + cheap.
  function autosaveNow(): void {
    writeAutosave({ doc: serializeDoc(currentDoc()), savedAt: Date.now(), name: projectName })
  }
  // A small non-blocking recovery banner (no modal → never hangs headless runs).
  function showRecoveryBanner(name: string, ageText: string, onRestore: () => void): void {
    const bar = document.createElement('div')
    bar.style.cssText =
      'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9999;display:flex;gap:10px;align-items:center;padding:10px 14px;background:#1b1b22;border:1px solid rgba(124,111,240,.5);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.45);color:#e8e8ee;font:13px system-ui,sans-serif'
    const msg = document.createElement('span')
    msg.textContent = `Recover unsaved work “${name}” from ${ageText}?`
    const mkBtn = (label: string, primary: boolean): HTMLButtonElement => {
      const b = document.createElement('button')
      b.textContent = label
      b.style.cssText = `padding:5px 12px;border-radius:7px;border:0;cursor:pointer;font:inherit;${primary ? 'background:#7c6ff0;color:#fff' : 'background:#2a2a33;color:#cfcfd8'}`
      return b
    }
    const restore = mkBtn('Restore', true)
    const dismiss = mkBtn('Dismiss', false)
    const close = (): void => bar.remove()
    restore.addEventListener('click', () => {
      onRestore()
      close()
    })
    dismiss.addEventListener('click', close)
    bar.append(msg, restore, dismiss)
    document.body.append(bar)
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
      showToast('Could not open project: ' + (e as Error).message, 'error')
    }
  }

  // ---- loop ----
  let simTime = 0
  let statusHandles: StatusHandles | null = null
  let frames = 0
  let fpsT = performance.now()
  let measureTool: MeasureTool | null = null // the tape-measure / annotate tool (built after mount)
  // Refresh the panel's live measurements once the drape settles (so the draped-fit
  // readout reflects the final drape, not mid-fall). Assigned after the panel is built.
  let onDrapeSettle: (() => void) | null = null
  let drapeSettled = false
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
      faceRig.update(mannequin.colliders) // hair + face features ride the head
      if (mode === 'templates') stack.step(dt)
      else patternCtl?.step(dt)
    },
    () => {
      if (mode === 'templates') stack.updateMeshes()
      else patternCtl?.updateMeshes()
      // When the active garment settles, refresh the live fit readout once.
      if (mode === 'templates') {
        const settled = stack.active?.controller.isSettled() ?? false
        if (settled && !drapeSettled) onDrapeSettle?.()
        drapeSettled = settled
      }
      // Adaptive rendering: full frame rate while anything moves (cloth settling, the avatar
      // animating, the timeline driving the camera), idle heartbeat otherwise. Camera drags +
      // programmatic camera moves + edits request their own repaint inside Viewport.
      const moving = (mode === 'templates' ? stack.anyAdvanced() : true) || anim.mode !== 'static' || player.playing
      viewport.render(moving)
      measureTool?.update() // reproject the measurement / note labels onto the canvas
      frames++
      const now = performance.now()
      if (now - fpsT >= 500) {
        statusHandles?.setFps((frames * 1000) / (now - fpsT))
        frames = 0
        fpsT = now
      }
    }
  )

  const { bodyType: bt, skinTone: _st, undertone: _ut, ...bodyScales } = bodySize
  if (bt !== 'female' || Object.values(bodyScales).some((v) => v !== 1)) setBody(bodySize)
  applySkin() // complexion is independent of the geometry-resize condition above
  loop.start()

  // ---- professional studio shell (menu bar · viewport · dock · status bar) ----
  const shell = createStudioShell(() => viewport.resize())
  viewport.mount(shell.center)
  // Measure & annotate tool — raycasts against the live garment + body meshes.
  measureTool = new MeasureTool(viewport.scene, viewport.camera, viewport.renderer.domElement, () => [
    ...stack.getMeshesAll(),
    mannequin.group
  ])
  measureTool.setOnChange(() => statusHandles?.setSelection(measureLabel()))
  function measureLabel(): string {
    const m = measureTool?.getMode()
    if (m === 'measure') return 'Measure — click two points'
    if (m === 'annotate') return 'Annotate — click a point'
    const n = (measureTool?.store.measurements.length ?? 0) + (measureTool?.store.annotations.length ?? 0)
    return n ? `${n} annotation${n === 1 ? '' : 's'} placed` : 'Ready'
  }
  function setMeasureMode(m: MeasureMode): void {
    measureTool?.setMode(m)
    statusHandles?.setSelection(measureLabel())
  }
  // Templates → the real per-garment flat pattern; Pattern mode → the sewn top;
  // an imported DXF (if present) takes over the 2D preview.
  const patternSVG = (): string =>
    importedPattern
      ? importedPatternToSVG(importedPattern)
      : mode === 'templates'
        ? garmentPatternSVG(getGarment(stack.active.data.garmentType), gradeParams(stack.active.data), mannequin.measurements, mannequin.colliders, stack.active.prints)
        : patternToSVG({ bust: patternParams.bust, length: patternParams.length })
  // Read a DXF pattern file → parse → preview in the 2D pane (round-trips the export).
  async function importPattern(): Promise<void> {
    const r = await openFile([{ name: 'DXF pattern', extensions: ['dxf'] }])
    if (!r) return
    const parsed = parsePatternDXF(r.content)
    if (!parsed.panels.length) {
      showToast('No pattern panels found in that DXF.', 'error')
      return
    }
    importedPattern = parsed
    centerTabs.show('pattern')
    centerTabs.refresh()
    statusHandles?.setSelection(`Imported pattern — ${patternSummary(parsed)} (edit a control to return to the live pattern)`)
  }

  // Coalesce a burst of slider `input` events into one expensive rebuild per animation
  // frame: the cheap buffer writes stay synchronous (undo/save/2D always see the latest
  // state), but the heavy work — garment rebuild, body resize / MarchingCubes, redrape,
  // canvas repaint — runs at most once per frame with the newest value, so dragging a
  // control stays smooth instead of rebuilding on every pixel. `rafCoalesce` is unit-tested;
  // every scheduler is cancelled on teardown so a rebuild can't fire against a cleared stack.
  const scheduleRebuild = rafCoalesce(() => {
    stack.rebuild(stack.active)
    centerTabs.refresh()
    api.refreshMetrics()
    syncBrowsers()
    viewport.requestRender()
  })
  const scheduleApplyLook = rafCoalesce(() => {
    stack.applyLook(stack.active)
    viewport.requestRender()
  })
  const schedulePhysics = rafCoalesce(() => {
    if (mode === 'templates') stack.setActivePhysics()
    else patternCtl?.setFabricPhysics()
    viewport.requestRender()
  })
  const scheduleRefreshDesign = rafCoalesce(() => {
    stack.refreshDesign(stack.active)
    viewport.requestRender()
  })
  const scheduleBodyResize = rafCoalesce(() => {
    setBody(bodySize)
    centerTabs.refresh()
    api.refreshMetrics()
    syncBrowsers()
    viewport.requestRender()
  })
  const onColorEdit = rafCoalesce((h: number) => {
    current.color = h
    if (editPart !== 'body') {
      stack.setPart(editPart, { color: h })
      syncBrowsers()
      viewport.requestRender()
      return
    }
    stack.active.fabric.color = h
    stack.active.data.color = h
    stack.applyLook(stack.active)
    syncBrowsers()
    viewport.requestRender()
  })
  const coalescedEdits = [scheduleRebuild, scheduleApplyLook, schedulePhysics, scheduleRefreshDesign, scheduleBodyResize, onColorEdit]

  // Persist the edit buffer → active layer, rebuild + refresh everywhere. Shared by
  // the 3D Property Editor AND the 2D pattern tools, so 2D and 3D drive one design.
  function applyGarmentEdit(): void {
    importedPattern = null // editing returns the 2D pane to the live garment pattern
    const l = stack.active
    l.data.garmentType = garment.type
    l.data.length = garment.length
    l.data.ease = garment.ease
    l.data.flare = garment.flare
    l.data.neckline = garment.neckline
    l.data.sleeve = garment.sleeve
    l.data.sleeveShape = garment.sleeveShape
    l.data.size = garment.size
    l.data.gradeRules = garment.gradeRules
    l.data.collar = garment.collar
    l.data.collarStyle = garment.collarStyle
    l.data.cuff = garment.cuff
    l.data.pleats = garment.pleats
    l.data.pleatStyle = garment.pleatStyle
    l.data.crease = garment.crease
    l.data.trouserBreak = garment.trouserBreak
    l.data.fringe = garment.fringe
    l.data.dart = garment.dart
    l.data.pocket = garment.pocket
    l.data.pocketStyle = garment.pocketStyle
    l.data.hem = garment.hem
    l.data.closure = garment.closure
    l.data.closureOpen = garment.closureOpen
    l.data.lined = garment.lined
    l.data.interfaced = garment.interfaced
    l.data.wet = garment.wet
    l.data.puff = garment.puff
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
    scheduleRebuild() // coalesced: the buffer copy above is synchronous, the rebuild runs once per frame
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
    nudgeEase: (d) => editFrom2D(() => (garment.ease = clampN(garment.ease + d, -0.03, 0.12))), // negative = compression fit
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
  const skinParam = params.get('skin')
  if (skinParam && (SKIN_TONES as string[]).includes(skinParam)) {
    bodySize.skinTone = skinParam as SkinTone
    const utParam = params.get('undertone')
    if (utParam && (UNDERTONES as string[]).includes(utParam)) bodySize.undertone = utParam as Undertone
    applySkin()
  }
  if (bodyChanged) setBody(bodySize)
  if (params.get('view') === 'pattern') centerTabs.show('pattern')
  if (params.get('view') === 'render') centerTabs.show('render')
  const bodyRender = params.get('body')
  if (bodyRender === 'mesh') mannequin.setBodyMode(false)
  else if (bodyRender === 'glb') mannequin.setBodyMode(true)
  if (params.get('heatmap') === '1') stack.setHeatmap(true)
  if (params.get('stress') === '1') stack.setStress(true)
  if (params.get('pressure') === '1') stack.setPressure(true)
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
  const hairParam = params.get('hair')
  if (hairParam && (HAIRSTYLES as string[]).includes(hairParam)) faceRig.setHairstyle(hairParam as Hairstyle)
  const hairColorParam = params.get('hairColor')
  if (hairColorParam) faceRig.setHairColor(parseInt(hairColorParam.replace('#', ''), 16))
  if (params.get('face') === '1') faceRig.setFaceVisible(true) // subtle features are opt-in
  const lightParam = params.get('light')
  if (lightParam) env.setLighting(lightParam)
  const backdropParam = params.get('backdrop')
  if (backdropParam) env.setBackdrop(backdropParam)
  const tonemapParam = params.get('tonemap')
  if (tonemapParam) viewport.setToneMapping(tonemapParam)
  if (params.get('dof') === '1') viewport.setDepthOfField(true)
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

  // ---- autosave + crash recovery ----
  // Snapshot the working doc to localStorage every 15s + on close (best-effort),
  // so a crash / accidental close doesn't lose work. Replace any prior studio's
  // timer + handler so re-entering doesn't stack them.
  if (autosaveTimer) clearInterval(autosaveTimer)
  if (autosaveHandler) window.removeEventListener('beforeunload', autosaveHandler)
  autosaveHandler = autosaveNow
  autosaveTimer = setInterval(autosaveNow, 15000)
  window.addEventListener('beforeunload', autosaveHandler)
  // On a fresh launch (not opening a saved project), offer to recover the last
  // snapshot via a non-blocking banner.
  if (!opened) {
    const snap = readAutosave()
    if (snap && shouldOfferRestore(snap, Date.now())) {
      showRecoveryBanner(snap.name, describeAge(Date.now() - snap.savedAt), () => {
        try {
          applyDoc(parseDoc(snap.doc))
          projectName = snap.name
          statusHandles?.setSelection(`Recovered “${snap.name}”`)
        } catch {
          /* corrupt snapshot — leave the fresh scene */
        }
      })
    }
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
      case 'usdz':
        await saveFile('garment.usdz', await exportUSDZ(meshes), [{ name: 'USDZ (AR)', extensions: ['usdz'] }])
        break
      case 'obj':
        await saveFile('garment.obj', await exportOBJ(meshes), [{ name: 'Wavefront OBJ', extensions: ['obj'] }])
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
      case 'pattern-tiled': {
        // tile the flat pattern across A4 pages at 1:1 for home printing (Print → Save as PDF)
        const res = garmentToPanels(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders)
        await saveFile('pattern-tiled-A4.html', tiledPatternHTML(res), [{ name: 'HTML', extensions: ['html'] }])
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

  // Record a one-click 360° turntable spin of the live view to a WebM clip.
  // Freeze OrbitControls' own auto-rotate + damping so the sweep is smooth, then
  // restore the framing afterwards.
  function recordTurntableSpin(): void {
    const controls = viewport.controls
    const wasAuto = controls.autoRotate
    const wasDamping = controls.enableDamping
    controls.autoRotate = false
    controls.enableDamping = false
    const base = viewport.getCameraPose()
    recordTurntable(viewport.renderer.domElement, base, (p) => viewport.setCameraPose(p), { seconds: 6 })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'designio-turntable.webm'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 8000)
      })
      .catch((err) => showToast('Turntable record failed: ' + (err as Error).message, 'error'))
      .finally(() => {
        controls.autoRotate = wasAuto
        controls.enableDamping = wasDamping
        viewport.setCameraPose(base) // restore the original framing
      })
  }

  // Runway line-up — a collection shot of the garment across several colourways,
  // rendered side by side into one PNG (snapshot per colourway, then composite).
  async function exportRunwayLineup(): Promise<void> {
    const l = stack.active
    const orig = l.data.color
    const cw = stack.colorways().map((c) => c.color)
    const colors = cw.length >= 2 ? cw.slice(0, 6) : lineupHues(orig, 4)
    const cellW = 640
    const urls: string[] = []
    for (const c of colors) {
      stack.setPart('body', { color: c })
      stack.updateMeshes()
      urls.push(viewport.renderStill(cellW))
    }
    stack.setPart('body', { color: orig }) // restore the working design
    stack.updateMeshes()
    const load = (u: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = () => rej(new Error('image decode failed'))
        im.src = u
      })
    const imgs = await Promise.all(urls.map(load))
    const { totalW, xs } = lineupCells(colors.length, cellW, 0)
    const canvas = document.createElement('canvas')
    canvas.width = totalW
    canvas.height = imgs[0]?.height ?? cellW
    const ctx = canvas.getContext('2d')!
    imgs.forEach((im, i) => ctx.drawImage(im, xs[i], 0))
    const b64 = canvas.toDataURL('image/png').split(',')[1] ?? ''
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'lineup'
    await saveFile(`${safe}-lineup.png`, bytes, [{ name: 'PNG image', extensions: ['png'] }])
    statusHandles?.setSelection(`Runway line-up — ${colors.length} looks`)
  }

  // Batch render — one crisp PNG per colourway, bundled into a ZIP (a lookbook set,
  // vs. the line-up's single composite). Snapshots the live view per colourway.
  async function exportBatchRender(): Promise<void> {
    const l = stack.active
    const orig = l.data.color
    const plan = batchRenderPlan(orig, stack.colorways().map((c) => ({ name: c.name, color: c.color })))
    const files: Record<string, Uint8Array> = {}
    for (const shot of plan) {
      stack.setPart('body', { color: shot.color })
      stack.updateMeshes()
      const b64 = viewport.renderStill(900).split(',')[1] ?? ''
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      files[shot.filename] = bytes
    }
    stack.setPart('body', { color: orig }) // restore the working design
    stack.updateMeshes()
    const { zipSync } = await import('fflate')
    const zip = zipSync(files, { level: 0 }) // PNGs are already compressed → store, don't re-deflate
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'designio'
    await saveFile(`${safe}-batch.zip`, zip, [{ name: 'ZIP archive', extensions: ['zip'] }])
    statusHandles?.setSelection(`Batch render — ${plan.length} PNGs`)
  }

  // The whole outfit as a manufacturing pack (spec + BOM + flat patterns per layer).
  function activeMetrics(l = stack.active): ReturnType<typeof garmentMetrics> {
    const def = getGarment(l.data.garmentType)
    return garmentMetrics(def.name, l.data.size, def, gradeParams(l.data), mannequin.measurements, mannequin.colliders)
  }
  /** Chest/waist/hip girth measured on the live *draped* garment (empty in pattern mode / no body tube). */
  function drapedFit(): ReturnType<typeof drapedGirths> {
    if (mode !== 'templates') return []
    const body = stack.active?.controller.bodySim()
    return body ? drapedGirths(body, mannequin.measurements) : []
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
        const metrics = activeMetrics(l)
        const markerLayout = nestMarker(garmentToPanels(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders).panels, 140)
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
          fibre: careLabel(l.fabric).fibre,
          care: careLabel(l.fabric).care,
          careSymbols: careSymbols(careInstructions(l.fabric)),
          metrics,
          pom: pomTable(def, l.data, mannequin.measurements, mannequin.colliders),
          marker: markerLayout,
          cost: costRollup({
            fabricM: markerLayout ? markerLayout.lengthCm / 100 : metrics.fabricM2 / 1.4,
            pricePerM: estimatedFabricPrice(l.fabric),
            threadM: threadMetres(metrics.seamCm),
            labourMin: estimateLabourMinutes(metrics.seamCm),
            labourRate: 15
          }),
          patternSVG: garmentPatternSVG(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders, l.prints)
        }
      })
    }
  }

  // ---- keyboard shortcuts (ignored while typing in a field) ----
  // Dispatch through the rebindable keymap (`ui/keymap`); the ? overlay edits it live.
  const keyHandlers: Record<KeyAction, () => unknown> = {
    undo,
    redo,
    copy: copyGarment,
    cut: cutGarment,
    paste: pasteGarment,
    duplicate: duplicateGarment,
    save: saveProject,
    open: openProject,
    delete: deleteGarment
  }
  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (e.key === 'Escape' && shortcutsOpen()) return closeShortcuts()
    if (e.key === 'Escape' && tourOpen()) return closeTour()
    if (e.key === '?') return e.preventDefault(), toggleShortcuts()
    const action = actionFor(keymap(), { key: e.key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey })
    if (!action) return
    if (KEY_ACTIONS.find((d) => d.id === action)!.prevent) e.preventDefault()
    void keyHandlers[action]()
  }
  document.addEventListener('keydown', onKey)

  // Pause the render/sim loop while the window is hidden/minimised (nothing to draw).
  const onVisibility = (): void => loop.setVisible(!document.hidden)
  document.addEventListener('visibilitychange', onVisibility)

  // ---- navigation out of the studio ----
  function teardown(): void {
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('visibilitychange', onVisibility)
    for (const s of coalescedEdits) s.cancel() // drop any pending coalesced rebuild before the stack clears
    closeShortcuts()
    loop.stop()
    shell.dispose()
    stack.clear()
    patternCtl?.clear()
    measureTool?.dispose() // free the measure gizmos + its canvas listeners
    // Stop the autosave timer so it doesn't keep firing (on a torn-down stack) off in the homepage.
    if (autosaveTimer) clearInterval(autosaveTimer)
    if (autosaveHandler) window.removeEventListener('beforeunload', autosaveHandler)
    autosaveTimer = undefined
    autosaveHandler = undefined
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
  const exportError = (err: unknown): void => {
    console.error('Export failed', err)
    showToast('Export failed: ' + (err as Error).message, 'error')
  }
  buildMenuBar(shell.menubar, {
    onNew: goHome,
    onProjects: goProjects,
    onSaveProject: saveProject,
    onSaveVersion: saveVersion,
    onVersionHistory: openHistory,
    onExportDio: () => void exportDio().catch(exportError),
    onOpenProject: () => void openProject(),
    onImportPattern: () => void importPattern(),
    onExport: (fmt) => void doExport(fmt).catch(exportError),
    onRecordTurntable: recordTurntableSpin,
    onRunwayLineup: () => void exportRunwayLineup().catch((err) => showToast('Line-up failed: ' + (err as Error).message, 'error')),
    onBatchRender: () => void exportBatchRender().catch((err) => showToast('Batch render failed: ' + (err as Error).message, 'error')),
    onUndo: undo,
    onRedo: redo,
    onCut: cutGarment,
    onCopy: copyGarment,
    onPaste: pasteGarment,
    onDuplicate: duplicateGarment,
    onDelete: deleteGarment,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    canPaste: () => clipboard !== null,
    canModifyLayers: () => stack.size > 1,
    onAnim: setAnimMode,
    onToggleWireframe: () => stack.setWireframe(!stack.wireframe),
    onToggleMannequin: () => (mannequin.group.visible = !mannequin.group.visible),
    onMeasure: () => setMeasureMode(measureTool?.getMode() === 'measure' ? 'off' : 'measure'),
    onAnnotate: () => setMeasureMode(measureTool?.getMode() === 'annotate' ? 'off' : 'annotate'),
    onCameraBookmarks: () =>
      openCameraBookmarks({
        items: listBookmarks().map((b) => ({ id: b.id, name: b.name })),
        onSaveCurrent: () => {
          const name = window.prompt('Name this view', `View ${listBookmarks().length + 1}`)
          if (name == null) return
          saveBookmark(name, viewport.getCameraPose())
          showToast('Saved camera view', 'success')
        },
        onRecall: (id) => {
          const b = listBookmarks().find((x) => x.id === id)
          if (b) viewport.setCameraPose(b.pose)
        },
        onDelete: (id) => deleteBookmark(id)
      }),
    onToggleDOF: () => {
      viewport.setDepthOfField(!viewport.depthOfField)
      showToast(viewport.depthOfField ? 'Depth of field on' : 'Depth of field off', 'info')
    },
    onClearMeasure: () => {
      measureTool?.clear()
      setMeasureMode('off')
    },
    onToggleLibrary: () => shell.toggleLeft(),
    onTogglePanel: () => shell.toggleRight(),
    onToggleSimple: () => {
      simpleView = !simpleView
      shell.setLeftVisible(!simpleView) // Simple = calm subset (hide Library + Object Browser)
      objBrowser.setVisible(!simpleView)
    },
    onResetLayout: () => shell.resetLayout(),
    onShortcuts: toggleShortcuts,
    onTour: () => startTour(),
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
    running,
    getGarment(stack.active.data.garmentType).name // seed the selection so it never flashes "No selection"
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
      scheduleApplyLook()
    },
    onPhysicsEdit: () => {
      Object.assign(stack.active.fabric, current)
      schedulePhysics()
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
    pressure: { get: () => stack.pressure, set: (on) => stack.setPressure(on) },
    wrinkles: { get: () => stack.wrinkles, set: (on) => stack.setWrinkles(on) },
    accessories: { get: (k) => accessories.isEnabled(k), set: (k, on) => accessories.setEnabled(k, on) },
    hair: {
      getStyle: () => faceRig.getHairstyle(),
      setStyle: (s) => faceRig.setHairstyle(s),
      getColor: () => faceRig.getHairColor(),
      setColor: (hex) => faceRig.setHairColor(hex),
      getFace: () => faceRig.isFaceVisible(),
      setFace: (on) => faceRig.setFaceVisible(on)
    },
    scene: {
      getLighting: () => env.getLighting(),
      setLighting: (id) => env.setLighting(id),
      getBackdrop: () => env.getBackdrop(),
      setBackdrop: (id) => env.setBackdrop(id)
    },
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
    onExport: (fmt) => void doExport(fmt).catch(exportError),
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
          .catch((err) => showToast('Record failed: ' + (err as Error).message, 'error'))
      },
      state: () => ({ playing: player.playing, loop: player.loop, time: player.time, total: player.total }),
      subscribe: (cb) => (timelineNotify = cb)
    },
    onAnimSpeed: (v) => {
      anim.speed = v
      viewport.controls.autoRotateSpeed = v * 4
    },
    onColor: onColorEdit,
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
          scheduleRefreshDesign()
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
    ombre: {
      get: () => stack.active.data.ombre,
      set: (d) => {
        stack.active.data.ombre = d
        stack.refreshDesign(stack.active)
      }
    },
    wear: {
      get: () => stack.active.data.wear,
      set: (w) => {
        stack.active.data.wear = w
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
    iridescent: {
      get: () => stack.active.data.iridescent,
      set: (k) => {
        stack.active.data.iridescent = k
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
    lace: {
      get: () => stack.active.data.lace,
      set: (p) => {
        stack.active.data.lace = p
        stack.applyLook(stack.active)
      }
    },
    fur: {
      get: () => stack.active.data.fur,
      set: (k) => {
        stack.active.data.fur = k
        stack.applyLook(stack.active)
      }
    },
    colorways: {
      list: () =>
        stack.colorways().map((cw) => ({
          id: cw.id,
          name: cw.name,
          color: cw.color,
          tag: [cw.textile, cw.ombre && 'ombré', cw.wear, cw.sparkle, cw.iridescent, cw.quilt, cw.lace && 'lace', cw.fur, cw.trim ? 'trim' : undefined].filter(Boolean).join(' · ') || undefined
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
    getDrapedFit: () => drapedFit(),
    bodySize,
    onBodySize: (b) => {
      Object.assign(bodySize, b)
      scheduleBodyResize()
    },
    onBodyMode: (realistic) => {
      mannequin.setBodyMode(realistic)
      if (mode === 'templates') stack.redrapeAll()
      else patternCtl?.resew()
    },
    skin: {
      getTone: () => bodySize.skinTone,
      getUndertone: () => bodySize.undertone ?? 'warm',
      set: (tone, undertone) => {
        bodySize.skinTone = tone
        bodySize.undertone = tone ? undertone : undefined
        applySkin()
      }
    },
    onSelectContext: (label) => statusHandles?.setSelection(label),
    onBack: goBack
  })
  // Refresh the live measurements (incl. the draped-fit readout) once the drape settles.
  onDrapeSettle = () => api.refreshMetrics()

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
  if (params.get('tour') === '1') window.setTimeout(() => startTour(), 500) // force the tour (verify/share)
  if (params.get('shortcuts') === '1') window.setTimeout(() => toggleShortcuts(), 500) // open the shortcut editor (verify/share)

  // First-run onboarding — a one-time guided tour on organic entry (never on a
  // snapshot deep-link, so captures/tests are untouched). Delayed so the shell
  // has laid out before the spotlight measures each region.
  if (!skipStart && !hasSeenTour()) {
    window.setTimeout(() => { if (!tourOpen()) startTour() }, 800)
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
  if (entryParams.get('crease')) cfg.crease = true
  if (entryParams.get('fringe')) cfg.fringe = true
  if (entryParams.get('break')) cfg.trouserBreak = true
  if (entryParams.get('open')) (cfg.closure = true), (cfg.closureOpen = true) // worn-open placket/zip (functional opening)
  if (entryParams.get('lined')) cfg.lined = true
  if (entryParams.get('interfaced')) cfg.interfaced = true
  if (entryParams.get('wet')) cfg.wet = true
  if (entryParams.get('puff')) cfg.puff = true
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
  const omb = entryParams.get('ombre')
  if (omb && (OMBRE_DIRECTIONS as string[]).includes(omb)) cfg.ombre = omb as OmbreDirection
  const wr = entryParams.get('wear')
  if (wr && (WEAR_KINDS as string[]).includes(wr)) cfg.wear = wr as WearKind
  const spk = entryParams.get('sparkle')
  if (spk && (SPARKLE_KINDS as string[]).includes(spk)) cfg.sparkle = spk as SparkleKind
  const iri = entryParams.get('iridescent')
  if (iri && (IRIDESCENT_KINDS as string[]).includes(iri)) cfg.iridescent = iri as IridescentKind
  const qlt = entryParams.get('quilt')
  if (qlt && (QUILT_PATTERNS as string[]).includes(qlt)) cfg.quilt = qlt as QuiltPattern
  const lc = entryParams.get('lace')
  if (lc && (LACE_PATTERNS as string[]).includes(lc)) cfg.lace = lc as LacePattern
  const fr2 = entryParams.get('fur')
  if (fr2 && (FUR_KINDS as string[]).includes(fr2)) cfg.fur = fr2 as FurKind
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
  const sbf = entryParams.get('sleeveBackFabric')
  if (sbf) (cfg.partFabrics ??= {}).sleeveBack = { fabricId: sbf, color: getFabric(sbf).color }
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
