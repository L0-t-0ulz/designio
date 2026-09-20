import * as THREE from 'three'
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
import { openGlossary } from './ui/glossaryOverlay'
import { openWhatsNew, whatsNewOpen, closeWhatsNew } from './ui/whatsNewOverlay'
import { loadSeenRelease, shouldAutoOpen } from './ui/whatsNew'
import { openCommandPalette, commandPaletteOpen, closeCommandPalette } from './ui/commandPaletteOverlay'
import { standardView, standardViews, type StandardViewId } from './studio/standardViews'
import { fitPose, visibleBounds } from './studio/zoomToFit'
import { moveItem, selectionAfterMove } from './studio/reorder'
import { randomDesign, seededRandom } from './studio/randomDesign'
import { ReviewStore } from './studio/reviewPins'
import { openReview } from './ui/reviewOverlay'
import { openTutorial } from './ui/tutorialOverlay'
import type { TutorialContext } from './ui/tutorial'
import { openVectorEditor } from './ui/vectorEditor'
import { openLessons } from './ui/lessonsOverlay'
import { openChallenges } from './ui/challengesOverlay'
import { openTemplates } from './ui/templatesOverlay'
import { applyTemplateToLayer } from './ui/templates'
import { registerPlugin, loadedPlugins, setPluginHost } from './plugins'
import { KEY_ACTIONS, actionFor, keymap, type KeyAction } from './ui/keymap'
import { startTour, closeTour, tourOpen, hasSeenTour } from './ui/onboardingTour'
import { buildStatusBar, type StatusHandles } from './shell/statusBar'
import { buildLibrary } from './shell/library'
import { buildObjectBrowser } from './shell/objectBrowser'
import { buildCenterTabs, type PatternEditor, type RenderApi } from './shell/centerTabs'
import type { Preset } from './start/presets'
import { setupEnvironment } from './core/Environment'
import { Loop } from './core/Loop'
import { renderPathTraced } from './core/PathTracer'
import { pathTraceProgress, type PathTraceQuality } from './core/pathTracePlan'
import { buildMannequin, type AnimationMode } from './avatar/Mannequin'
import { skinLook, SKIN_LOOK, SKIN_TONES, UNDERTONES, type SkinTone, type Undertone } from './avatar/skin'
import { POSE_NAMES, type PoseName } from './avatar/poses'
import { POSTURES, type PostureName } from './avatar/posture'
import { WALK_STYLE_NAMES, type WalkStyleName } from './avatar/walkStyles'
import { getBodyPreset } from './avatar/bodyPresets'
import { FIGURE_BLOCKS, figureBlockGrade, applyFigureBlockToConfig, type FigureBlock } from './studio/figureBlock'
import { getKidsBlock } from './avatar/kidsSizes'
import { Accessories, ACCESSORY_KINDS, accessoryAnchors, radialMount, type AccessoryKind } from './avatar/accessories'
import { SOCK_HEIGHTS, type SockHeight } from './avatar/wornSizing'
import { SUNGLASSES_STYLES, type SunglassesStyle } from './avatar/shades'
import { CROWN_STYLES, type CrownStyle } from './avatar/crown'
import { HAT_BAND_STYLES, BAND_TRIMS, type HatBandParams, type HatBandStyle, type BandTrim } from './avatar/hatBand'
import { UNDERBILL_CLASSIC, type CapBillParams } from './avatar/capBill'
import { CAP_PANEL_COUNTS, type CapPanelCount } from './avatar/capPanels'
import { PUFF_SHAPES, type PuffLogoParams, type PuffShape } from './avatar/puffLogo'
import { BOONIE_SNAPS, type BoonieSnap } from './avatar/boonie'
import { FaceRig, HAIRSTYLES, type Hairstyle } from './avatar/face'
import { SIM_RESOLUTIONS, qualityToSubsteps, type SimResolution } from './cloth/simQuality'
import { WIND_PRESET_NAMES, getWindPreset, gustWind } from './cloth/windPresets'
import { TimelinePlayer } from './studio/TimelinePlayer'
import { newKeyframeId, sampleTimeline, type Keyframe } from './studio/timeline'
import { MeasureTool, type MeasureMode } from './studio/MeasureTool'
import { parsePatternDXF, importedPatternToSVG, patternSummary, type ImportedPattern } from './export/patternImport'
import { lineupCells, lineupHues } from './studio/lineup'
import { renderGiftFold } from './studio/giftFold'
import { contactGrid, contactViews } from './studio/contactSheet'
import { sizeRunPlan, headwearSizeRunPlan } from './studio/sizeRunStrip'
import { twoAvatarPlan, twoAvatarCells } from './studio/twoAvatar'
import { anatomyShots } from './studio/anatomyShots'
import { buildHangerProp, hangerCapsule } from './studio/hangerShot'
import { openDrapeComparator } from './ui/drapeComparator'
import { viewer360HTML } from './export/viewer360'
import { lineSheetHTML } from './export/lineSheet'
import { qcSheetHTML } from './export/qcSheet'
import { sampleOrderHTML } from './export/sampleOrder'
import { turntablePose } from './studio/turntable'
import { batchRenderPlan } from './studio/batchRender'
import type { GarmentType, SleeveStyle, CollarStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from './garment/templates'
import { COLLAR_STYLES, SLEEVE_SHAPES, POCKET_STYLES, PLEAT_STYLES, FRILL_STYLES } from './garment/templates'
import { HEM_SHAPES, type HemShape, type NecklineStyle } from './cloth/Garment'
import { GARMENT_IDS, getGarment } from './garments/registry'
import { pocketPlacements } from './garments/decor'
import { hardwarePlacements, hardwareBOM } from './garments/hardware'
import { beltHardwareBOM } from './garments/strapHardware'
import { PatternController } from './pattern/PatternController'
import { DEFAULT_PATTERN } from './pattern/pattern'
import { openSketchPad, sketchPadOpen, closeSketchPad } from './pattern/SketchPad'
import { demoOutline } from './pattern/drawnPanel'
import { demoArrangement } from './pattern/arrangement'
import { demoStyleLines } from './pattern/styleLines'
import { demoInternalShapes } from './pattern/panelFeatures'
import { parseStitchParams, stitchSummary, SEAM_TYPES } from './garment/stitchTypes'
import { zipperSpecFor, zipperSummary } from './garment/zipper'
import { fashioningPlan, isFullyFashioned, fashioningSummary } from './garment/fullyFashioned'
import { fleeceRevealZones, fleeceLiningNote } from './fabric/fleeceLining'
import { convertibleDetailsFor, convertibleNote } from './garment/convertibleDetails'
import { parsePhysicalParams, physicalDefaults, physicalSummary } from './fabric/physicalProps'
import { drapeBench, benchSummary } from './fabric/drapeBench'
import { draftPreset, cloneDraft } from './fabric/weaveDraft'
import { knitPreset, cloneChart } from './fabric/knitChart'
import { colourworkPreset, cloneColourwork } from './fabric/colourwork'
import { BALACLAVA_FACES, BALACLAVA_WORN, CONVERTIBLE_WORN, type BalaclavaFace, type BalaclavaWorn, type ConvertibleWorn } from './garments/schema'
import { yarnPreset } from './fabric/yarn'
import { FABRIC_LIBRARY, getFabric, fabricToSolverParams, estimatedFabricPrice, type Fabric } from './fabric/FabricLibrary'
import { exportGLB, exportGLBDraco, exportOBJ, exportSTL, exportUSDZ } from './export/exporters3d'
import { recordClip, recordTurntable } from './studio/turntable'
import { SOCIAL_PRESETS } from './studio/socialPresets'
import { patternToSVG, patternToDXF } from './export/patternExport'
import { panelsToDXF, garmentPatternSVG, garmentPatternDXF, garmentToPanels } from './export/garmentPattern'
import { patternPieceCount } from './export/patternPieces'
import { patternToHPGL, patternToRollHPGL } from './export/plotter'
import { alignNest, nestSVG } from './export/gradeNest'
import { skuAndBarcode } from './export/sku'
import { checkGrainlines } from './export/grainline'
import { symmetryDeviation, symmetrySummary, symmetryVerdict } from './export/symmetry'
import { nearestNamedColor } from './fabric/namedColors'
import { trimCard, type TrimLine } from './export/trimCard'
import { gradingTable } from './export/gradingTable'
import { colourwayPage, colourwayTag } from './export/colourwayPage'
import { tiledPatternHTML, pageSize } from './export/tiledPrint'
import { techpackHTML, techpackJSON, type TechpackData } from './export/techpack'
import { garmentMetrics } from './export/garmentMetrics'
import { manufactureHTML, type ManufactureBundle } from './export/manufacture'
import { strainTint } from './fabric/heatmap'
import { legendHTML } from './fabric/legend'
import { openRepeatPreview } from './ui/repeatPreview'
import { pomTable } from './export/pom'
import { bodyToMeasurements, setMeasurement } from './avatar/measure'
import { parseScanOBJ, scanToMeasurements } from './avatar/bodyScan'
import { parseBVH, bvhJointNames, bvhDuration } from './avatar/mocap'
import { recommendSize, sizeRecommendationReadout } from './avatar/sizeRecommend'
import { nestMarker } from './export/marker'
import { costRollup, estimateLabourMinutes, headwearFabricM, headwearTrims, priceFromCost, DEFAULT_FREIGHT_PER_UNIT, DEFAULT_APPAREL_DUTY_PCT, priceTrimLines } from './export/cost'
import { shopifyCsv, type ListingInput } from './export/listing'
import { productPageHtml } from './export/productPage'
import { APPROVAL_STATUSES, type ApprovalStatus } from './export/approval'
import { circularScore, fibreGroup, garmentFootprint, longevityCare, materialPassport } from './export/sustainability'
import { supplierFor } from './export/suppliers'
import { factoryPackJSON } from './export/factoryPack'
import { sizeSetFiles } from './export/sizeSet'
import { threadMetres } from './export/thread'
import { drapedGirths } from './export/drapeFit'
import { careLabel, careInstructions } from './export/careLabel'
import { careSymbols } from './export/careSymbols'
import { saveFile, openFile } from './export/save'
import { createControlPanel, type DesignMode, type ExportFormat, type GarmentState } from './ui/panel'
import { showStartPage } from './start/StartPage'
import { TEXTILE_PATTERNS, type TextilePattern, REPEAT_MODES, type RepeatMode } from './fabric/textile'
import { TARTAN_KINDS, type TartanKind } from './fabric/tartan'
import { OMBRE_DIRECTIONS, type OmbreDirection } from './fabric/ombre'
import { WEAR_KINDS, type WearKind } from './fabric/wear'
import { DUOTONE_KINDS, type DuotoneKind } from './fabric/duotone'
import { demoSwatchCanvas } from './fabric/swatch'
import { SPARKLE_KINDS, type SparkleKind } from './fabric/sparkle'
import { getPartyFinish, applyPartyFinish } from './fabric/partyFinishes'
import { IRIDESCENT_KINDS, type IridescentKind } from './fabric/iridescent'
import { QUILT_PATTERNS, type QuiltPattern } from './fabric/quilt'
import { LACE_PATTERNS, type LacePattern } from './fabric/lace'
import { FUR_KINDS, type FurKind } from './fabric/fur'
import { colorRefLabel } from './fabric/namedColors'
import { showHomepage } from './start/Homepage'
import { showProjectsPage } from './start/ProjectsPage'
import { loadProject, saveProjectRecord, snapshotProject, listSnapshots, restoreSnapshot, deleteSnapshot, listProjects } from './studio/projectStore'
import { portfolioHtml } from './export/portfolio'
import { configuratorHtml } from './export/configurator'
import { tryOnWidgetHtml } from './export/tryOn'
import { mobileCompanionHTML } from './export/mobile'
import { separationsHTML } from './export/separations'
import { bagSpec, bagCutSheetHTML } from './export/bag'
import { shoeLast, shoeCutSheetHTML } from './export/shoe'
import { getWrapPreset, applyWrapPreset } from './avatar/wrapPresets'
import { openVersionHistory } from './ui/versionHistory'
import { diffDocs } from './studio/diffDoc'
import { shareUrl, shareTokenFrom, decodeShare } from './studio/shareLink'
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
,
  resetConstruction,
  copyFabricToAllParts,
  hasPartFabricOverrides
} from './studio/document'

// ---- shared scene (built once) -------------------------------------------
const container = document.getElementById('app') as HTMLElement
const viewport = new Viewport(container)
const env = setupEnvironment(viewport.scene, viewport.renderer)
const mannequin = buildMannequin()
viewport.scene.add(mannequin.group)
const reviewStore = new ReviewStore()
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
  let windTurb = 0 // turbulence (0 = uniform wind); set by a wind preset
  const patternParams = { ...DEFAULT_PATTERN }
  let mode: DesignMode = 'templates'
  let importedPattern: ImportedPattern | null = null // an imported DXF shown in the 2D pane
  let editPart: PartId = 'body' // which garment part colour/fabric edits target

  // The multi-garment stack (each layer = its own material · controller · fabric).
  const stack = new GarmentStack(viewport.scene, mannequin.colliders, mannequin.measurements, mannequin.bodyCollider, () => mannequin.anchors())
  // Interactive tutorial: a live snapshot of what the user has done in the studio.
  let hasExported = false
  const getTutorialContext = (): TutorialContext => {
    const l = stack.active
    const d = l.data
    const def = getGarment(d.garmentType)
    return {
      fabricChosen: d.fabricId !== def.defaultFabric,
      prints: l.prints.length,
      hasFinish: !!(d.textile || d.ombre || d.wear || d.sparkle || d.iridescent || d.duotone || d.tartan || d.colourwork || d.quilt || d.lace || d.fur),
      colorways: stack.colorways().length,
      exported: hasExported
    }
  }
  // When the body swaps (the async GLB avatar arrives, or the toggle), re-drape every
  // garment so its pins re-bind to the new body's anchors instead of the old one's.
  // Body swap (async GLB load / toggle): REBUILD, don't just redrape — a redrape
  // refills each piece from its build-time spec, which was measured on the OLD
  // body; the swapped body's landmarks (especially the head) sit elsewhere, so
  // crown headwear refilled at the stale crown and slid to the neck.
  mannequin.setOnBodyChange(() => stack.rebuildAll())
  let patternCtl: PatternController | null = null

  // Panel edit buffers — always mirror the ACTIVE layer.
  const garment: GarmentState = {
    type: l0.garmentType,
    length: l0.length,
    ease: l0.ease,
    easeChest: l0.easeChest,
    easeWaist: l0.easeWaist,
    easeHip: l0.easeHip,
    flare: l0.flare,
    neckline: l0.neckline,
    sleeve: l0.sleeve,
    sleeveShape: l0.sleeveShape,
    faceStyle: l0.faceStyle,
    breath: l0.breath,
    distressed: l0.distressed,
    balaclavaWorn: l0.balaclavaWorn,
    convertibleWorn: l0.convertibleWorn,
    cuffHeight: l0.cuffHeight,
    slouch: l0.slouch,
    scarfWidth: l0.scarfWidth,
    scarfPin: l0.scarfPin,
    pinAt: l0.pinAt,
    scarfKnot: l0.scarfKnot,
    scarfDouble: l0.scarfDouble,
    scarfBlanket: l0.scarfBlanket,
    scarfTuck: l0.scarfTuck,
    gaiterWorn: l0.gaiterWorn,
    snoodWorn: l0.snoodWorn,
    cuffPatch: l0.cuffPatch,
    pomScale: l0.pomScale,
    pomColor: l0.pomColor,
    pomFur: l0.pomFur,
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
    piping: l0.piping,
    stitch: l0.stitch,
    physicalFabric: l0.physicalFabric,
    dart: l0.dart,
    pocket: l0.pocket,
    pocketStyle: l0.pocketStyle,
    hem: l0.hem,
    hemShape: l0.hemShape,
    closure: l0.closure,
    closureOpen: l0.closureOpen,
    closureDesign: l0.closureDesign ? { ...l0.closureDesign } : undefined,
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
    pilling: l0.pilling,
    recycledFabric: l0.recycledFabric,
    deadstockFabric: l0.deadstockFabric,
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
    garment.easeChest = l.data.easeChest
    garment.easeWaist = l.data.easeWaist
    garment.easeHip = l.data.easeHip
    garment.flare = l.data.flare
    garment.neckline = l.data.neckline
    garment.sleeve = l.data.sleeve
    garment.sleeveShape = l.data.sleeveShape
    garment.faceStyle = l.data.faceStyle
    garment.breath = l.data.breath
    garment.distressed = l.data.distressed
    garment.balaclavaWorn = l.data.balaclavaWorn
    garment.convertibleWorn = l.data.convertibleWorn
    garment.cuffHeight = l.data.cuffHeight
    garment.slouch = l.data.slouch
    garment.scarfWidth = l.data.scarfWidth
    garment.scarfPin = l.data.scarfPin
    garment.pinAt = l.data.pinAt
    garment.scarfKnot = l.data.scarfKnot
    garment.scarfDouble = l.data.scarfDouble
    garment.scarfBlanket = l.data.scarfBlanket
    garment.scarfTuck = l.data.scarfTuck
    garment.gaiterWorn = l.data.gaiterWorn
    garment.snoodWorn = l.data.snoodWorn
    garment.cuffPatch = l.data.cuffPatch
    garment.pomScale = l.data.pomScale
    garment.pomColor = l.data.pomColor
    garment.pomFur = l.data.pomFur
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
    garment.piping = l.data.piping
    garment.stitch = l.data.stitch
    garment.physicalFabric = l.data.physicalFabric
    garment.dart = l.data.dart
    garment.pocket = l.data.pocket
    garment.pocketStyle = l.data.pocketStyle
    garment.hem = l.data.hem
    garment.hemShape = l.data.hemShape
    garment.closure = l.data.closure
    garment.closureOpen = l.data.closureOpen
    garment.closureDesign = l.data.closureDesign ? { ...l.data.closureDesign } : undefined
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
    garment.pilling = l.data.pilling
    garment.recycledFabric = l.data.recycledFabric
    garment.deadstockFabric = l.data.deadstockFabric
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
      onDelete: (snapId) => deleteSnapshot(pid, snapId),
      onCompare: (snapId) => {
        const doc = restoreSnapshot(pid, snapId) // returns the snapshot doc (no side effects)
        return doc ? diffDocs(doc, currentDoc()) : []
      },
      onCompareTwo: (aId, bId) => {
        // version-to-version diff: how version A differs from version B (both by id)
        const da = restoreSnapshot(pid, aId)
        const db = restoreSnapshot(pid, bId)
        return da && db ? diffDocs(db, da) : []
      }
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
  // Deterministic snapshot mode (`?freezeAt=<simSeconds>` — capture tooling): stop
  // stepping once sim time crosses the mark. The fixed-step sequence is frame-rate
  // independent, so the frozen state is the SAME sim step every run — even for a
  // look whose stack repulsion never lets the solvers reach their dead-stop sleep.
  const freezeAtParam = new URLSearchParams(location.search).get('freezeAt')
  const freezeAt = freezeAtParam === null ? null : Math.max(0, Number(freezeAtParam) || 0)
  // `?catchUp=<steps>` — let a slow-rendering capture run advance more fixed steps
  // per frame (the step sequence is unchanged; only the wall time to the mark is)
  const catchUp = Number(new URLSearchParams(location.search).get('catchUp') ?? 0)
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
      if (freezeAt !== null && simTime >= freezeAt) return // frozen for deterministic capture
      simTime += dt
      if (windGust > 0) {
        const w = gustWind(windBaseX, windBaseZ, windGust, simTime) // pulse the wind (gust/breeze)
        stack.setWind(w.x, w.z, windTurb)
        patternCtl?.setWind(w.x, w.z)
      }
      player.tick(dt) // timeline playback drives the camera + avatar subject
      mannequin.update(simTime, anim.mode, anim.speed)
      accessories.update(mannequin.colliders, mannequin.extremities()) // worn pieces follow the live body
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
  if (catchUp > 0) loop.setCatchUp(catchUp)
  loop.start()

  // Capture tooling (scripts/golden.cjs) polls this to snapshot the settled drape:
  // true once the sim froze at its `?freezeAt` mark (or, without one, once every
  // visible garment's solver reached its dead-stop sleep). A wall-clock wait breaks
  // on CI's software rasterizer — the loop caps catch-up at 8 steps/frame, so slow
  // frames make sim time lag wall time and a fixed wait can capture a mid-fall
  // (nondeterministic) frame.
  ;(window as unknown as { __drapeSettled?: () => boolean }).__drapeSettled = () =>
    mode !== 'templates' || (freezeAt !== null ? simTime >= freezeAt : !stack.anyAdvanced())

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
  /** Flip vertex snapping and say which way it went — there is no persistent chrome
   *  for the measure tool, so the status line is the only feedback available. */
  function toggleMeasureSnap(): void {
    if (!measureTool) return
    const on = !measureTool.getSnap()
    measureTool.setSnap(on)
    showToast(on ? 'Measurements snap to vertices' : 'Measurements follow the cursor', 'info')
  }
  function setMeasureMode(m: MeasureMode): void {
    measureTool?.setMode(m)
    statusHandles?.setSelection(measureLabel())
  }
  // Templates → the real per-garment flat pattern; Pattern mode → the sewn top;
  // an imported DXF (if present) takes over the 2D preview.
  const patternSVG = (viewOpts?: { grid?: boolean }): string =>
    importedPattern
      ? importedPatternToSVG(importedPattern)
      : mode === 'templates'
        ? garmentPatternSVG(
            getGarment(stack.active.data.garmentType),
            gradeParams(stack.active.data),
            mannequin.measurements,
            mannequin.colliders,
            stack.active.prints,
            {
              grid: viewOpts?.grid,
              notes: stack.active.data.patternNotes,
              ...(stack.heatmap || stack.stress
                ? {
                    // project the live 3D strain onto the flat panels (heat tint per panel)
                    tints: Object.fromEntries(Object.entries(stack.active.controller.panelStrains()).map(([k, v]) => [k, strainTint(v)])),
                    tintNote: 'panel tint = live strain'
                  }
                : {})
            }
          )
        : patternToSVG({ bust: patternParams.bust, length: patternParams.length })
  // Read a DXF pattern file → parse → preview in the 2D pane (round-trips the export).
  async function importMocap(): Promise<void> {
    const r = await openFile([{ name: 'BVH mocap', extensions: ['bvh'] }])
    if (!r) return
    const clip = parseBVH(r.content)
    if (!clip) {
      showToast('That file is not a valid BVH mocap clip.', 'error')
      return
    }
    const names = bvhJointNames(clip)
    showToast(`Mocap loaded — ${names.length} joints · ${clip.frames.length} frames · ${bvhDuration(clip).toFixed(1)}s (retarget coming soon)`, 'success')
  }
  async function importBodyScan(): Promise<void> {
    const r = await openFile([{ name: 'OBJ scan', extensions: ['obj'] }])
    if (!r) return
    const verts = parseScanOBJ(r.content)
    if (verts.length < 100) {
      showToast('That OBJ has too few vertices to read a body from.', 'error')
      return
    }
    const scan = scanToMeasurements(verts)
    // apply the derived measurements to the mannequin (real cm → body multipliers)
    let bp = { ...bodySize }
    bp = setMeasurement(bp, 'height', scan.heightCm)
    bp = setMeasurement(bp, 'bust', scan.chestCm)
    bp = setMeasurement(bp, 'waist', scan.waistCm)
    bp = setMeasurement(bp, 'hips', scan.hipCm)
    Object.assign(bodySize, bp)
    setBody(bodySize)
    showToast(`Scan applied — ${scan.heightCm} cm · chest ${scan.chestCm} · waist ${scan.waistCm} · hip ${scan.hipCm}`, 'success')
  }
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
    l.data.easeChest = garment.easeChest
    l.data.easeWaist = garment.easeWaist
    l.data.easeHip = garment.easeHip
    l.data.flare = garment.flare
    l.data.neckline = garment.neckline
    l.data.sleeve = garment.sleeve
    l.data.sleeveShape = garment.sleeveShape
    l.data.faceStyle = garment.faceStyle
    l.data.breath = garment.breath
    l.data.distressed = garment.distressed
    l.data.balaclavaWorn = garment.balaclavaWorn
    l.data.convertibleWorn = garment.convertibleWorn
    l.data.cuffHeight = garment.cuffHeight
    l.data.slouch = garment.slouch
    l.data.scarfWidth = garment.scarfWidth
    l.data.scarfPin = garment.scarfPin
    l.data.pinAt = garment.pinAt
    l.data.scarfKnot = garment.scarfKnot
    l.data.scarfDouble = garment.scarfDouble
    l.data.scarfBlanket = garment.scarfBlanket
    l.data.scarfTuck = garment.scarfTuck
    l.data.gaiterWorn = garment.gaiterWorn
    l.data.snoodWorn = garment.snoodWorn
    l.data.cuffPatch = garment.cuffPatch
    l.data.pomScale = garment.pomScale
    l.data.pomColor = garment.pomColor
    l.data.pomFur = garment.pomFur
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
    l.data.piping = garment.piping
    l.data.stitch = garment.stitch
    l.data.physicalFabric = garment.physicalFabric
    l.data.dart = garment.dart
    l.data.pocket = garment.pocket
    l.data.pocketStyle = garment.pocketStyle
    l.data.hem = garment.hem
    l.data.hemShape = garment.hemShape
    l.data.closure = garment.closure
    l.data.closureOpen = garment.closureOpen
    l.data.closureDesign = garment.closureDesign ? { ...garment.closureDesign } : undefined
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
    l.data.pilling = garment.pilling
    l.data.recycledFabric = garment.recycledFabric
    l.data.deadstockFabric = garment.deadstockFabric
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
  const NECKS: NecklineStyle[] = ['scoop', 'crew', 'v', 'one-shoulder', 'strapless']
  const SLEEVES: SleeveStyle[] = ['none', 'short', 'elbow', 'three-quarter', 'bracelet', 'long']
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
    nudgeSleeve: (d) => editFrom2D(() => (garment.sleeve = cycle(SLEEVES, garment.sleeve, d))),
    addNote: (x, y, text) => {
      const l = stack.active
      ;(l.data.patternNotes ??= []).push({ x, y, text })
      centerTabs.refresh()
    },
    clearNotes: () => {
      stack.active.data.patternNotes = undefined
      centerTabs.refresh()
    },
  }
  // Render tab: supersample the current view to a PNG + save it to disk.
  const renderApi: RenderApi = {
    capture: (width) => viewport.renderStill(width),
      focusPull: (t) => viewport.setFocusPull(t),
    // Offline path-traced hero render: pause the loop (we own the canvas), converge, resume.
    pathTrace: async ({ width, quality, onProgress, signal }) => {
      const wasRunning = loop.isRunning()
      loop.setRunning(false)
      try {
        return await renderPathTraced(viewport, {
          width,
          quality,
          signal,
          onProgress: (s, t) => onProgress(pathTraceProgress(s, t))
        })
      } finally {
        loop.setRunning(wasRunning)
        viewport.requestRender() // repaint the live view under the render pane
      }
    },
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
  if (params.get('drawnPanel') === 'demo') {
    // draw-your-own panel, exercised headlessly: sew the built-in demo sketch
    setMode('pattern') // assigns patternCtl (the narrowing can't see through the call)
    ;(patternCtl as PatternController | null)?.buildDrawn(demoOutline(), patternParams)
  }
  if (params.get('arranged') === 'demo') {
    // sewing lines & arrangement: the four-panel colour-block bodice demo
    setMode('pattern')
    const demo = demoArrangement()
    ;(patternCtl as PatternController | null)?.buildArranged(demo.panels, demo.seams, patternParams)
  }
  if (params.get('styleLines') === 'demo') {
    // style lines: the front split by a princess curve, colour-blocked + re-sewn
    setMode('pattern')
    const demo = demoStyleLines()
    ;(patternCtl as PatternController | null)?.buildArranged(demo.panels, demo.seams, patternParams, [-0.07, 0.09, 0])
  }
  if (params.get('drapeTest')) {
    // virtual drape bench for the active fabric — result as a long toast + console
    const bench = drapeBench(stack.active.fabric)
    const line = `${stack.active.fabric.name}: ${benchSummary(bench)}`
    console.log('[drape-bench]', line)
    showToast(line, 'info', 12000)
  }
  {
    // ?weaveDraft= / ?knitChart= / ?colourwork= — custom weave structure + colour on the active garment
    const preset = draftPreset(params.get('weaveDraft') ?? '')
    const knit = knitPreset(params.get('knitChart') ?? '')
    const cw = colourworkPreset(params.get('colourwork') ?? '')
    if (preset) stack.active.data.weaveDraft = cloneDraft(preset.draft)
    if (knit) stack.active.data.knitChart = cloneChart(knit.chart)
    if (cw) stack.active.data.colourwork = cloneColourwork(cw.chart)
    if (preset || knit || cw) stack.applyLook(stack.active)
    const yp = yarnPreset(params.get('yarn') ?? '')
    if (yp) stack.setYarn({ ...yp.yarn }) // ?yarn=<preset> — look + drape re-derive together
  }
  if (params.get('internalShapes') === 'demo') {
    // internal shapes & notches: waist darts (real take-up) + a keyhole cut-out
    setMode('pattern')
    const demo = demoInternalShapes()
    ;(patternCtl as PatternController | null)?.buildArranged(demo.panels, demo.seams, patternParams)
  }
  const animParam = params.get('anim') as AnimationMode | null
  if (animParam) setAnimMode(animParam)
  const poseParam = params.get('pose')
  if (poseParam && (POSE_NAMES as string[]).includes(poseParam)) setPose(poseParam as PoseName)
  const walkParam = params.get('walk')
  if (walkParam && WALK_STYLE_NAMES.includes(walkParam)) mannequin.setWalkStyle(walkParam as WalkStyleName)
  const postureParam = params.get('posture')
  if (postureParam && (POSTURES as string[]).includes(postureParam)) mannequin.setPosture(postureParam as PostureName)
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
  const kidsParam = params.get('kids')
  if (kidsParam) {
    const block = getKidsBlock(kidsParam)
    if (block) {
      Object.assign(bodySize, block.shape)
      bodyChanged = true
    }
  }
  const bellyParam = params.get('belly')
  if (bellyParam && Number.isFinite(+bellyParam)) {
    bodySize.belly = +bellyParam
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
  // ?block= — petite/tall/plus auto-proportioning: set the matching body-shape preset
  // (the garment length/ease grade is applied to the config in the entry parsing)
  const blockParam = params.get('block')
  if (blockParam && (FIGURE_BLOCKS as string[]).includes(blockParam)) {
    const bp = figureBlockGrade(blockParam as FigureBlock).bodyPreset
    const preset = bp ? getBodyPreset(bp) : undefined
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
  if (params.get('utilisation') === '1') stack.setUtilisation(true)
  if (params.get('wrinklemap') === '1') stack.setWrinkleMap(true)
  if (params.get('tearing') === '1') stack.setTearing(true)
  // closure-designer deep-links (?buttons= ?buttonMm= ?buttonColor= ?zipColor=)
  {
    const d: Record<string, number> = {}
    const bn = params.get('buttons')
    if (bn && Number.isFinite(+bn)) d.buttons = +bn
    const bm = params.get('buttonMm')
    if (bm && Number.isFinite(+bm)) d.buttonMm = +bm
    const bc = params.get('buttonColor')
    if (bc && /^[0-9a-f]{6}$/i.test(bc)) d.buttonColor = parseInt(bc, 16)
    const zc = params.get('zipColor')
    if (zc && /^[0-9a-f]{6}$/i.test(zc)) d.zipColor = parseInt(zc, 16)
    if (Object.keys(d).length) {
      stack.active.data.closureDesign = { ...stack.active.data.closureDesign, ...d }
      stack.rebuild(stack.active)
    }
  }
  const pillingParam = params.get('pilling')
  if (pillingParam && Number.isFinite(+pillingParam)) {
    stack.active.data.pilling = Math.max(0, Math.min(1, +pillingParam))
    stack.applyLook(stack.active)
  }
  // Ghost mannequin — hide the body/accessories/hair (colliders stay live) for a product shot
  let ghostOn = false
  const setGhostMode = (on: boolean): void => {
    ghostOn = on
    mannequin.setGhost(on)
    accessories.group.visible = !on
    faceRig.group.visible = !on
    statusHandles?.setSelection(on ? 'Ghost mannequin — body hidden (product shot)' : 'Ghost mannequin off')
  }
  // Hanger shot — ghost + limp hang on a wire hanger (the flat-lay alternate)
  let hangerProp: ReturnType<typeof buildHangerProp> | null = null
  const setHangerShot = (on: boolean): void => {
    setGhostMode(on)
    stack.setHangerMode(on ? [hangerCapsule(mannequin.measurements)] : null)
    if (on && !hangerProp) {
      hangerProp = buildHangerProp(mannequin.measurements)
      viewport.scene.add(hangerProp)
    } else if (!on && hangerProp) {
      viewport.scene.remove(hangerProp)
      hangerProp = null
    }
    statusHandles?.setSelection(on ? 'Hanger shot — hanging drape (product shot)' : 'Hanger shot off')
  }
  if (params.get('ghost') === '1') setGhostMode(true)
  // Smoothing slip — an invisible simulated underlayer (shapewear): outer garments
  // drape over its smooth surface instead of the bare body detail.
  let slipLayerRef: ReturnType<typeof stack.addLayer> | null = null
  const setSlip = (on: boolean): void => {
    if (on && !slipLayerRef) {
      slipLayerRef = stack.addLayer({ ...defaultLayer('slip-dress'), ease: 0.003, flare: 0, underlayer: true, color: 0xcfc9c2 }, false)
      statusHandles?.setSelection('Smoothing slip on — outer layers drape over it')
    } else if (!on && slipLayerRef) {
      stack.removeLayer(slipLayerRef)
      slipLayerRef = null
      statusHandles?.setSelection('Smoothing slip off')
    }
    syncBrowsers()
  }
  // Steam & press — drag over the garment to relax its wrinkles (the virtual iron).
  let pressMode = false
  const pressRay = new THREE.Raycaster()
  const pressNdc = new THREE.Vector2()
  const pressPoint = (ev: PointerEvent): void => {
    const el = viewport.renderer.domElement
    const rect = el.getBoundingClientRect()
    pressNdc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
    pressRay.setFromCamera(pressNdc, viewport.camera)
    const meshes = stack.layers.filter((l) => l.data.visible && !l.data.underlayer).flatMap((l) => l.controller.getMeshes())
    const hit = pressRay.intersectObjects(meshes, false)[0]
    if (hit) stack.pressAt(hit.point.x, hit.point.y, hit.point.z, 0.055)
  }
  const onPressDown = (ev: PointerEvent): void => {
    if (!pressMode || ev.button !== 0) return
    ev.stopPropagation()
    pressPoint(ev)
    const move = (mv: PointerEvent): void => pressPoint(mv)
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  viewport.renderer.domElement.addEventListener('pointerdown', onPressDown, true)
  const setPressMode = (on: boolean): void => {
    pressMode = on
    viewport.controls.enabled = !on // the iron drags on the cloth, not the camera
    viewport.renderer.domElement.style.cursor = on ? 'crosshair' : ''
    statusHandles?.setSelection(on ? 'Steam & press — drag over the garment to relax wrinkles' : 'Steam & press off')
  }
  if (params.get('slip') === '1') setSlip(true)
  if (params.get('hanger') === '1') setHangerShot(true)
  if (params.get('wrinkles') === '1') stack.setWrinkles(true)
  const windParam = params.get('wind')
  if (windParam && WIND_PRESET_NAMES.includes(windParam)) {
    const p = getWindPreset(windParam)!
    windX = windBaseX = p.x
    windZ = windBaseZ = p.z
    windGust = p.gust
    windTurb = p.turbulence ?? 0
    stack.setWind(p.x, p.z, windTurb)
  }
  const accParam = params.get('accessories')
  if (accParam) for (const k of accParam.split(',')) if ((ACCESSORY_KINDS as string[]).includes(k.trim())) accessories.setEnabled(k.trim() as AccessoryKind, true)
  {
    // ?brimWidth= & ?brimDroop= & ?brimWire=1 — the parametric brim designer
    const bw = parseFloat(params.get('brimWidth') ?? '')
    const bd = parseFloat(params.get('brimDroop') ?? '')
    const patch: { width?: number; droop?: number; wire?: boolean } = {}
    if (Number.isFinite(bw)) patch.width = bw
    if (Number.isFinite(bd)) patch.droop = bd
    if (params.get('brimWire') === '1') patch.wire = true
    if (Object.keys(patch).length) accessories.setBrim(patch)
    // ?crownShape= — the crown shape library (the fedora's blocked crease)
    const cs = params.get('crownShape')
    if (cs && (CROWN_STYLES as string[]).includes(cs)) accessories.setCrown(cs as CrownStyle)
    // ?flapWorn= — ear flaps down over the ears, or folded up onto the crown
    const fw = params.get('flapWorn')
    if (fw === 'up' || fw === 'down') accessories.setFlapWorn(fw)
    // ?sunglassesStyle= — the frame block (wayfarer · aviator · round · cat-eye)
    const gs = params.get('sunglassesStyle')
    if (gs && (SUNGLASSES_STYLES as string[]).includes(gs)) accessories.setSunglassesStyle(gs as SunglassesStyle)
    // ?sockHeight= — a real sock cut, measured in cm up from the sole
    const sh = params.get('sockHeight')
    if (sh && (SOCK_HEIGHTS as string[]).includes(sh)) accessories.setSockHeight(sh as SockHeight)
    // ?turbanWraps= — the turban wrap-count designer (2–8 wraps)
    const tw = parseFloat(params.get('turbanWraps') ?? '')
    if (Number.isFinite(tw)) accessories.setTurbanWraps(tw)
    // ?hatBand= & ?bandTrim= & ?bandColor= — the hat band designer
    const bandPatch: Partial<HatBandParams> = {}
    const hb = params.get('hatBand')
    if (hb && (HAT_BAND_STYLES as string[]).includes(hb)) bandPatch.style = hb as HatBandStyle
    const bt = params.get('bandTrim')
    if (bt && (BAND_TRIMS as string[]).includes(bt)) bandPatch.trim = bt as BandTrim
    const bc = params.get('bandColor')
    if (bc) bandPatch.color = parseInt(bc.replace('#', ''), 16)
    if (Object.keys(bandPatch).length) accessories.setHatBand(bandPatch)
    // ?billCurve= & ?underbill= & ?squatchee=0 — the cap bill designer
    const billPatch: Partial<CapBillParams> = {}
    const curve = parseFloat(params.get('billCurve') ?? '')
    if (Number.isFinite(curve)) billPatch.curve = curve
    const ub = params.get('underbill')
    if (ub) billPatch.underbill = ub === '1' ? UNDERBILL_CLASSIC : parseInt(ub.replace('#', ''), 16)
    if (params.get('squatchee') === '0') billPatch.squatchee = false
    if (Object.keys(billPatch).length) accessories.setCapBill(billPatch)
    // ?capPanels=5|6 — the crown construction picker
    const cp = parseInt(params.get('capPanels') ?? '', 10)
    if ((CAP_PANEL_COUNTS as number[]).includes(cp)) accessories.setCapPanels(cp as CapPanelCount)
    // ?puffLogo= & ?puffColor= — 3D puff cap embroidery
    const puffPatch: Partial<PuffLogoParams> = {}
    const pl = params.get('puffLogo')
    if (pl && (PUFF_SHAPES as string[]).includes(pl)) puffPatch.shape = pl as PuffShape
    const pc = params.get('puffColor')
    if (pc) puffPatch.color = parseInt(pc.replace('#', ''), 16)
    if (Object.keys(puffPatch).length) accessories.setPuffLogo(puffPatch)
    // ?boonieSnap= — snap the boonie's brim sides up
    const bs = params.get('boonieSnap')
    if (bs && (BOONIE_SNAPS as string[]).includes(bs)) accessories.setBoonieSnap(bs as BoonieSnap)
  }
  const hairParam = params.get('hair')
  if (hairParam && (HAIRSTYLES as string[]).includes(hairParam)) faceRig.setHairstyle(hairParam as Hairstyle)
  const hairColorParam = params.get('hairColor')
  if (hairColorParam) faceRig.setHairColor(parseInt(hairColorParam.replace('#', ''), 16))
  if (params.get('face') === '1') faceRig.setFaceVisible(true) // subtle features are opt-in
  // ?freckles=<0..1> — the malar scatter, coloured off the current skin tone
  const freckleParam = parseFloat(params.get('freckles') ?? '')
  if (Number.isFinite(freckleParam)) {
    const look = bodySize.skinTone ? skinLook(bodySize.skinTone, bodySize.undertone ?? 'warm') : SKIN_LOOK
    faceRig.setFreckles(freckleParam, look.color)
  }
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

  // ---- path-traced hero render deep-link (`?pathtrace=1[&ptQuality=draft|high|ultra]`) ----
  // Once the drape settles, open the Render tab in path-traced mode + converge a hero still.
  if (params.get('pathtrace') === '1') {
    const q = (params.get('ptQuality') as PathTraceQuality) || 'high'
    void (async () => {
      const settled = (window as unknown as { __drapeSettled?: () => boolean }).__drapeSettled
      for (let i = 0; i < 600 && !(settled?.() ?? true); i++) await new Promise((r) => setTimeout(r, 50))
      centerTabs.pathTrace(q)
    })()
  }

  // ---- scarf gift-fold deep-link (`?giftFold=1`) ----
  // Once the drape settles, compose the flat folded product shot + overlay it.
  if (params.get('giftFold') === '1') {
    void (async () => {
      const settled = (window as unknown as { __drapeSettled?: () => boolean }).__drapeSettled
      for (let i = 0; i < 600 && !(settled?.() ?? true); i++) await new Promise((r) => setTimeout(r, 50))
      const img = document.createElement('img')
      img.src = giftFoldDataUrl()
      img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;z-index:99999;background:#1a1a1e'
      document.body.appendChild(img)
    })()
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
      measurements: mannequin.measurements,
      trims: mode === 'templates' ? activeTrimCard(l) : undefined,
      grading:
        mode === 'templates'
          ? gradingTable(pomTable(getGarment(l.data.garmentType), l.data, mannequin.measurements, mannequin.colliders))
          : undefined,
      colourways: colourwayPage(stack.colorways(), (id) => FABRIC_LIBRARY.find((f) => f.id === id)?.name)
    }
  }

  /** The trim card for a layer, derived from its construction so a garment with its
   *  closure switched off never sources buttons. Thread comes from the same
   *  `threadMetres` the cost sheet bills, so the two pages cannot disagree. */
  function activeTrimCard(l: typeof stack.active): TrimLine[] {
    const metrics = activeMetrics(l)
    const d = l.data
    return trimCard({
      closure: d.closure ? ((getGarment(d.garmentType).closureStyle ?? 'button') as 'button' | 'zip') : undefined,
      closureDesign: d.closureDesign,
      seamCm: metrics.seamCm,
      threadM: threadMetres(metrics.seamCm),
      drawstring: d.drawstring,
      waistband: d.waistband,
      ribbing: d.ribbing,
      fringe: d.fringe,
      piping: d.piping,
      lined: d.lined,
      trimColor: d.trim ? d.trimColor : undefined,
      bodyColor: d.color
    })
  }
  /**
   * The strain-view legend, floated over the viewport. Rebuilt from the stack rather
   * than cached, so switching fabric or view can never leave a legend describing a
   * scale the garment is no longer drawn on.
   */
  const legendEl = document.createElement('div')
  legendEl.className = 'dio-legend-host'
  shell.center.appendChild(legendEl)
  function syncLegend(): void {
    const legend = stack.strainLegend()
    legendEl.innerHTML = legend ? legendHTML(legend) : ''
    legendEl.style.display = legend ? '' : 'none'
  }
  syncLegend()

  /** The bolt width the marker nesting and the yardage estimate already assume. */
  const ROLL_WIDTH_CM = 140

  async function doExport(fmt: ExportFormat): Promise<void> {
    hasExported = true // tutorial: the "export your design" task
    const meshes = mode === 'templates' ? stack.getMeshesAll() : (patternCtl?.getMeshes() ?? [])
    const dims = { bust: patternParams.bust, length: patternParams.length }
    const l = stack.active
    switch (fmt) {
      case 'glb':
        await saveFile('garment.glb', await exportGLB(meshes), [{ name: 'glTF binary', extensions: ['glb'] }])
        break
      case 'glb-draco': {
        const { data, compressed, reason } = await exportGLBDraco(meshes)
        await saveFile('garment.draco.glb', data, [{ name: 'glTF binary (Draco)', extensions: ['glb'] }])
        showToast(compressed ? 'Exported Draco-compressed glTF' : `Exported uncompressed glTF — ${reason}`, compressed ? 'success' : 'info')
        break
      }
      case 'usdz':
        await saveFile('garment.usdz', await exportUSDZ(meshes), [{ name: 'USDZ (AR)', extensions: ['usdz'] }])
        break
      case 'obj':
        await saveFile('garment.obj', await exportOBJ(meshes), [{ name: 'Wavefront OBJ', extensions: ['obj'] }])
        break
      case 'stl':
        await saveFile('garment.stl', await exportSTL(meshes), [{ name: 'STL (3D print)', extensions: ['stl'] }])
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
      case 'plt': {
        // HPGL plots the real panel outlines, so it is only meaningful for the
        // per-garment draft; the sewn-pattern mode has no panel geometry to send.
        if (mode !== 'templates') {
          showToast('Plotter export needs a garment pattern — switch to Templates mode', 'info')
          break
        }
        const { panels } = garmentToPanels(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders)
        await saveFile('pattern.plt', patternToHPGL(panels), [{ name: 'HPGL plotter', extensions: ['plt', 'hpgl'] }])
        break
      }
      case 'plt-roll': {
        if (mode !== 'templates') {
          showToast('Plotter export needs a garment pattern — switch to Templates mode', 'info')
          break
        }
        const { panels } = garmentToPanels(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders)
        const plot = patternToRollHPGL(panels, ROLL_WIDTH_CM)
        await saveFile(`pattern-roll-${plot.widthCm}cm.plt`, plot.hpgl, [{ name: 'HPGL plotter', extensions: ['plt', 'hpgl'] }])
        showToast(`Nested to ${plot.widthCm} cm — ${(plot.lengthCm / 100).toFixed(2)} m at ${(plot.efficiency * 100).toFixed(0)}% efficiency`, 'success')
        break
      }
      case 'grade-nest': {
        if (mode !== 'templates') {
          showToast('Grade nest needs a garment pattern — switch to Templates mode', 'info')
          break
        }
        // Re-draft each size through the real grading path, so the nest shows the
        // grade the factory will actually cut rather than a scaled picture of one size.
        const def = getGarment(l.data.garmentType)
        const nest = SIZES.map((size) => ({
          size,
          outline: garmentToPanels(def, gradeParams({ ...l.data, size }), mannequin.measurements, mannequin.colliders).panels[0]?.outline ?? []
        })).filter((n) => n.outline.length > 0)
        if (!nest.length) {
          showToast('This garment has no graded panels to nest', 'info')
          break
        }
        const svg = nestSVG(alignNest(nest), { label: `${def.name} — grade nest` })
        await saveFile('grade-nest.svg', svg, [{ name: 'SVG', extensions: ['svg'] }])
        break
      }
      case 'pattern-tiled':
      case 'pattern-tiled-a3':
      case 'pattern-tiled-a2': {
        // tile the flat pattern at 1:1 for printing (Print → Save as PDF). A larger
        // sheet is the same layout on fewer pages — a copy shop can run A2, which
        // turns a 30-page tape-up into 8.
        const id = fmt === 'pattern-tiled-a2' ? 'A2' : fmt === 'pattern-tiled-a3' ? 'A3' : 'A4'
        const res = garmentToPanels(getGarment(l.data.garmentType), gradeParams(l.data), mannequin.measurements, mannequin.colliders)
        await saveFile(`pattern-tiled-${id}.html`, tiledPatternHTML(res, { page: pageSize(id) }), [{ name: 'HTML', extensions: ['html'] }])
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
      case 'factory-json':
        await saveFile('factory-pack.json', factoryPackJSON(manufactureBundle()), [{ name: 'JSON', extensions: ['json'] }])
        break
      case 'listing': {
        // e-commerce listing — a Shopify product CSV (one row per colour×size variant)
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const metrics = activeMetrics(l)
        const cost = costRollup({ fabricM: metrics.fabricM2 / 1.4, pricePerM: estimatedFabricPrice(l.fabric), threadM: threadMetres(metrics.seamCm), labourMin: estimateLabourMinutes(metrics.seamCm), labourRate: 15 })
        const cw = stack.colorways()
        const colours = (cw.length ? cw.map((c) => c.color) : [l.data.color]).map((hex) => ({ label: colorRefLabel(hex).replace(/^TR-\d+\s*/, '') || 'Colour', hex: '#' + hex.toString(16).padStart(6, '0') }))
        const label = careLabel(l.fabric)
        const inp: ListingInput = { name: projectName !== 'Untitled' ? projectName : def.name, fabricName: l.fabric.name, fibre: label.fibre, colours, sizes: [...SIZES], priceUsd: priceFromCost({ cost: cost.total }).retail, careLines: label.care }
        await saveFile('shopify-listing.csv', new TextEncoder().encode(shopifyCsv(inp)), [{ name: 'CSV', extensions: ['csv'] }])
        statusHandles?.setSelection(`Listing CSV — ${inp.colours.length}×${inp.sizes.length} variants`)
        break
      }
      case 'product-page': {
        // a self-contained storefront product page (hero render + swatches + sizes)
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const metrics = activeMetrics(l)
        const cost = costRollup({ fabricM: metrics.fabricM2 / 1.4, pricePerM: estimatedFabricPrice(l.fabric), threadM: threadMetres(metrics.seamCm), labourMin: estimateLabourMinutes(metrics.seamCm), labourRate: 15 })
        const cw = stack.colorways()
        const colours = (cw.length ? cw.map((c) => c.color) : [l.data.color]).map((hex) => ({ label: colorRefLabel(hex).replace(/^TR-\d+\s*/, '') || 'Colour', hex: '#' + hex.toString(16).padStart(6, '0') }))
        const label = careLabel(l.fabric)
        const inp: ListingInput = { name: projectName !== 'Untitled' ? projectName : def.name, fabricName: l.fabric.name, fibre: label.fibre, colours, sizes: [...SIZES], priceUsd: priceFromCost({ cost: cost.total }).retail, careLines: label.care }
        await saveFile('product-page.html', new TextEncoder().encode(productPageHtml(inp, viewport.renderStill(900))), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection('Product page exported — open in a browser')
        break
      }
      case 'portfolio': {
        // a shareable gallery of every saved project (thumbnail grid)
        const items = listProjects().map((p) => ({ name: p.name, thumb: p.thumb, updatedAt: p.updatedAt }))
        const brand = projectName !== 'Untitled' ? projectName : 'Portfolio'
        await saveFile('portfolio.html', new TextEncoder().encode(portfolioHtml(brand, items)), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection(`Portfolio — ${items.length} design(s)`)
        break
      }
      case 'configurator': {
        // a customer-facing made-to-order configurator (live colour/size + order link)
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const metrics = activeMetrics(l)
        const cost = costRollup({ fabricM: metrics.fabricM2 / 1.4, pricePerM: estimatedFabricPrice(l.fabric), threadM: threadMetres(metrics.seamCm), labourMin: estimateLabourMinutes(metrics.seamCm), labourRate: 15 })
        const cw = stack.colorways()
        const colours = (cw.length ? cw.map((c) => c.color) : [l.data.color]).map((hex) => ({ label: colorRefLabel(hex).replace(/^TR-\d+\s*/, '') || 'Colour', hex: '#' + hex.toString(16).padStart(6, '0') }))
        const label = careLabel(l.fabric)
        const inp: ListingInput = { name: projectName !== 'Untitled' ? projectName : def.name, fabricName: l.fabric.name, fibre: label.fibre, colours, sizes: [...SIZES], priceUsd: priceFromCost({ cost: cost.total }).retail, careLines: label.care }
        await saveFile('configurator.html', new TextEncoder().encode(configuratorHtml(inp, { shareUrl: shareUrl(currentDoc(), location.href) })), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection('Made-to-order configurator exported')
        break
      }
      case 'shoe-pattern': {
        // a parametric shoe upper cut sheet (last + upper panels)
        const styleP = entryParams.get('shoe') ?? 'oxford'
        const shoeStyle = (['oxford', 'derby', 'sneaker', 'boot', 'loafer'].includes(styleP) ? styleP : 'oxford') as import('./export/shoe').ShoeStyle
        const size = Math.max(30, Math.min(50, parseInt(entryParams.get('shoeSize') ?? '42', 10) || 42))
        await saveFile(`${shoeStyle}-eu${size}-upper.html`, new TextEncoder().encode(shoeCutSheetHTML(shoeStyle, shoeLast(size))), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection(`Shoe upper — ${shoeStyle} EU ${size}`)
        break
      }
      case 'bag-pattern': {
        // a parametric bag pattern cut sheet (panels + material + hardware from the strap library)
        const styleParam = entryParams.get('bag') ?? 'tote'
        const style = (['tote', 'handbag', 'crossbody', 'clutch'].includes(styleParam) ? styleParam : 'tote') as import('./export/bag').BagStyle
        const spec = bagSpec(style)
        await saveFile(`${spec.style}-bag-pattern.html`, new TextEncoder().encode(bagCutSheetHTML(spec)), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection(`Bag pattern — ${spec.style}`)
        break
      }
      case 'separations': {
        // screen-print colour separations — one registered screen per print
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const name = projectName !== 'Untitled' ? projectName : def.name
        await saveFile('print-separations.html', new TextEncoder().encode(separationsHTML(l.prints, name)), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection(`Print separations — ${l.prints.length} screen(s)`)
        break
      }
      case 'tryon-widget': {
        // an embeddable product widget (hero + colourways + a "view on you" AR hand-off)
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const cw = stack.colorways()
        const colours = (cw.length ? cw.map((c) => c.color) : [l.data.color]).map((hex) => ({ label: colorRefLabel(hex).replace(/^TR-\d+\s*/, '') || 'Colour', hex: '#' + hex.toString(16).padStart(6, '0') }))
        const label = careLabel(l.fabric)
        const metrics = activeMetrics(l)
        const cost = costRollup({ fabricM: metrics.fabricM2 / 1.4, pricePerM: estimatedFabricPrice(l.fabric), threadM: threadMetres(metrics.seamCm), labourMin: estimateLabourMinutes(metrics.seamCm), labourRate: 15 })
        const inp: ListingInput = { name: projectName !== 'Untitled' ? projectName : def.name, fabricName: l.fabric.name, fibre: label.fibre, colours, sizes: [...SIZES], priceUsd: priceFromCost({ cost: cost.total }).retail, careLines: label.care }
        await saveFile('try-on-widget.html', new TextEncoder().encode(tryOnWidgetHtml(inp, viewport.renderStill(720), { shareUrl: shareUrl(currentDoc(), location.href) })), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection('Try-on widget exported — embed via <iframe>')
        break
      }
      case 'mobile': {
        // a phone-first, installable (PWA) companion viewer of the active design
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const cw = stack.colorways()
        const colours = (cw.length ? cw.map((c) => c.color) : [l.data.color]).map((hex) => ({ label: colorRefLabel(hex).replace(/^TR-\d+\s*/, '') || 'Colour', hex: '#' + hex.toString(16).padStart(6, '0') }))
        const label = careLabel(l.fabric)
        const metrics = activeMetrics(l)
        const cost = costRollup({ fabricM: metrics.fabricM2 / 1.4, pricePerM: estimatedFabricPrice(l.fabric), threadM: threadMetres(metrics.seamCm), labourMin: estimateLabourMinutes(metrics.seamCm), labourRate: 15 })
        const inp: ListingInput = { name: projectName !== 'Untitled' ? projectName : def.name, fabricName: l.fabric.name, fibre: label.fibre, colours, sizes: [...SIZES], priceUsd: priceFromCost({ cost: cost.total }).retail, careLines: label.care }
        await saveFile('mobile-companion.html', new TextEncoder().encode(mobileCompanionHTML(inp, viewport.renderStill(720), { shareUrl: shareUrl(currentDoc(), location.href) })), [{ name: 'HTML', extensions: ['html'] }])
        statusHandles?.setSelection('Mobile companion exported — installable PWA')
        break
      }
      case 'size-set': {
        // the graded run: regenerate the flat pattern at every size through gradeParams
        const l = stack.active
        const def = getGarment(l.data.garmentType)
        const enc = new TextEncoder()
        const files: Record<string, Uint8Array> = {}
        for (const f of sizeSetFiles(def.name)) {
          const params = gradeParams({ ...l.data, size: f.size })
          files[f.svgName] = enc.encode(garmentPatternSVG(def, params, mannequin.measurements, mannequin.colliders, l.prints))
          files[f.dxfName] = enc.encode(garmentPatternDXF(def, params, mannequin.measurements, mannequin.colliders, l.prints))
        }
        const { zipSync } = await import('fflate')
        await saveFile('size-set.zip', zipSync(files, { level: 6 }), [{ name: 'ZIP archive', extensions: ['zip'] }])
        statusHandles?.setSelection(`Size set — ${Object.keys(files).length} pattern files (XS–XXL)`)
        break
      }
    }
  }

  // Record a one-click 360° turntable spin of the live view to a WebM clip.
  // Freeze OrbitControls' own auto-rotate + damping so the sweep is smooth, then
  // restore the framing afterwards.
  function recordTurntableSpin(presetName = 'native', motionBlur = false): void {
    const controls = viewport.controls
    const wasAuto = controls.autoRotate
    const wasDamping = controls.enableDamping
    controls.autoRotate = false
    controls.enableDamping = false
    const base = viewport.getCameraPose()
    const preset = SOCIAL_PRESETS.find((sp) => sp.name === presetName) ?? SOCIAL_PRESETS[0]
    recordTurntable(viewport.renderer.domElement, base, (p) => viewport.setCameraPose(p), { seconds: 6, aspect: preset.aspect ?? undefined, motionBlur })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = motionBlur ? 'designio-turntable-blur.webm' : preset.aspect ? `designio-turntable-${preset.name}.webm` : 'designio-turntable.webm'
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

  // Scarf gift-fold — a flat folded product shot for a line sheet (the active
  // garment's live fabric albedo composited into the fold, or its base colour).
  function giftFoldDataUrl(): string {
    const l = stack.active
    let albedo: CanvasImageSource | null = null
    for (const mesh of l.controller.getMeshes()) {
      const mats = Array.isArray((mesh as THREE.Mesh).material) ? ((mesh as THREE.Mesh).material as THREE.Material[]) : [(mesh as THREE.Mesh).material]
      for (const mat of mats) {
        const map = (mat as THREE.MeshStandardMaterial | undefined)?.map
        if (map?.image) {
          albedo = map.image as CanvasImageSource
          break
        }
      }
      if (albedo) break
    }
    const W = 1000
    const H = 1400
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    renderGiftFold(ctx, W, H, { color: l.data.color, albedo })
    return canvas.toDataURL('image/png')
  }
  async function exportScarfGiftFold(): Promise<void> {
    const b64 = giftFoldDataUrl().split(',')[1] ?? ''
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'scarf'
    await saveFile(`${safe}-giftfold.png`, bytes, [{ name: 'PNG image', extensions: ['png'] }])
    statusHandles?.setSelection('Gift-fold product shot')
  }

  // Size-run strip — the garment worn at every size XS→XXL, side by side (the
  // line-up machinery, sized not coloured). Each size is re-graded + settled
  // synchronously before its still.
  async function exportSizeRunStrip(): Promise<void> {
    const l = stack.active
    const origSize = l.data.size
    const cellW = 520
    // headwear is fit by head circumference, so its run is labelled by the hat size run
    const isHeadwear = getGarment(l.data.garmentType).pieces.some((p) => p.kind === 'headTube')
    const plan = isHeadwear ? headwearSizeRunPlan() : sizeRunPlan()
    const urls: string[] = []
    for (const cell of plan) {
      l.data.size = cell.size
      stack.rebuild(l)
      for (let i = 0; i < 150; i++) stack.step(1 / 60) // settle the fresh drape headlessly
      stack.updateMeshes()
      urls.push(viewport.renderStill(cellW))
    }
    l.data.size = origSize // restore the working design
    stack.rebuild(l)
    for (let i = 0; i < 150; i++) stack.step(1 / 60)
    stack.updateMeshes()
    const load = (u: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = () => rej(new Error('image decode failed'))
        im.src = u
      })
    const imgs = await Promise.all(urls.map(load))
    const cellH = imgs[0]?.height ?? cellW
    const labelH = 30
    const { totalW, xs } = lineupCells(plan.length, cellW, 0)
    const canvas = document.createElement('canvas')
    canvas.width = totalW
    canvas.height = cellH + labelH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#101014'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    imgs.forEach((im, i) => {
      ctx.drawImage(im, xs[i], 0)
      ctx.fillStyle = '#c9cbd4'
      ctx.fillText(plan[i].label, xs[i] + cellW / 2, cellH + labelH * 0.7)
    })
    const b64 = canvas.toDataURL('image/png').split(',')[1] ?? ''
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'size-run'
    await saveFile(`${safe}-size-run.png`, bytes, [{ name: 'PNG image', extensions: ['png'] }])
    statusHandles?.setSelection(`Size-run strip — ${plan.length} sizes`)
  }

  // Two-avatar scene — the design on two figures side by side. The body + cloth sim
  // is a singleton, so (like the line-up) it swaps the body preset, re-settles + snaps
  // each avatar, then composites them.
  async function exportTwoAvatarScene(): Promise<void> {
    const plan = twoAvatarPlan()
    const cellW = 560
    const origBody = { ...bodySize } // save the working body
    const urls: string[] = []
    for (const slot of plan) {
      const preset = getBodyPreset(slot.bodyPreset)
      if (preset) {
        Object.assign(bodySize, preset.shape)
        setBody(bodySize)
      }
      for (let i = 0; i < 150; i++) stack.step(1 / 60) // settle the fresh drape headlessly
      stack.updateMeshes()
      urls.push(viewport.renderStill(cellW))
    }
    Object.assign(bodySize, origBody) // restore the working body
    setBody(bodySize)
    for (let i = 0; i < 150; i++) stack.step(1 / 60)
    stack.updateMeshes()
    const load = (u: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = () => rej(new Error('image decode failed'))
        im.src = u
      })
    const imgs = await Promise.all(urls.map(load))
    const cellH = imgs[0]?.height ?? cellW
    const labelH = 30
    const { totalW, xs } = twoAvatarCells(cellW, 0)
    const canvas = document.createElement('canvas')
    canvas.width = totalW
    canvas.height = cellH + labelH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#101014'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    imgs.forEach((im, i) => {
      ctx.drawImage(im, xs[i], 0)
      ctx.fillStyle = '#c9cbd4'
      ctx.fillText(plan[i].label, xs[i] + cellW / 2, cellH + labelH * 0.7)
    })
    const b64 = canvas.toDataURL('image/png').split(',')[1] ?? ''
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'two-avatar'
    await saveFile(`${safe}-two-avatar.png`, bytes, [{ name: 'PNG image', extensions: ['png'] }])
    statusHandles?.setSelection('Two-avatar scene')
  }

  // Multi-angle contact sheet — the classic product-turnaround grid: the garment
  // shot from N angles around the current view, labelled + composited into one PNG.
  async function exportContactSheet(): Promise<void> {
    const views = contactViews(6)
    const pose0 = viewport.getCameraPose()
    const cellW = 560
    const urls: string[] = []
    for (const v of views) {
      viewport.setCameraPose(turntablePose(pose0, v.t))
      urls.push(viewport.renderStill(cellW))
    }
    viewport.setCameraPose(pose0) // back to the working view
    const load = (u: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const im = new Image()
        im.onload = () => res(im)
        im.onerror = () => rej(new Error('image decode failed'))
        im.src = u
      })
    const imgs = await Promise.all(urls.map(load))
    const cellH = imgs[0]?.height ?? cellW
    const grid = contactGrid(views.length, cellW, cellH)
    const canvas = document.createElement('canvas')
    canvas.width = grid.totalW
    canvas.height = grid.totalH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#101014'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = '600 15px system-ui, sans-serif'
    ctx.textAlign = 'center'
    imgs.forEach((im, i) => {
      ctx.drawImage(im, grid.cells[i].x, grid.cells[i].y)
      ctx.fillStyle = '#c9cbd4'
      ctx.fillText(views[i].label, grid.cells[i].x + cellW / 2, grid.labelY[i])
    })
    const b64 = canvas.toDataURL('image/png').split(',')[1] ?? ''
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'contact-sheet'
    await saveFile(`${safe}-contact-sheet.png`, bytes, [{ name: 'PNG image', extensions: ['png'] }])
    statusHandles?.setSelection(`Contact sheet — ${views.length} angles`)
  }

  // 360° product viewer — a self-contained HTML sprite viewer: 24 pre-rendered
  // angles, drag / arrows to spin, gentle autoplay. One file a client can open anywhere.
  async function exportViewer360(): Promise<void> {
    const FRAMES = 24
    const pose0 = viewport.getCameraPose()
    const frames: string[] = []
    for (let i = 0; i < FRAMES; i++) {
      viewport.setCameraPose(turntablePose(pose0, i / FRAMES))
      frames.push(viewport.renderStill(720))
    }
    viewport.setCameraPose(pose0) // back to the working view
    const html = viewer360HTML(projectName || 'DesignIO garment', frames)
    const bytes = new TextEncoder().encode(html)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'garment'
    await saveFile(`${safe}-360.html`, bytes, [{ name: 'HTML document', extensions: ['html'] }])
    statusHandles?.setSelection(`360° viewer — ${FRAMES} frames`)
  }

  // Line sheet — the printable wholesale one-pager: hero shot + fabric/fibre +
  // colourway swatches + size run + key measurements + landed cost & pricing.
  async function exportLineSheet(): Promise<void> {
    const l = stack.active
    const def = getGarment(l.data.garmentType)
    const metrics = activeMetrics(l)
    const marker = nestMarker(garmentToPanels(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders).panels, 140)
    const cost = costRollup({
      fabricM: marker ? marker.lengthCm / 100 : metrics.fabricM2 / 1.4,
      pricePerM: estimatedFabricPrice(l.fabric),
      threadM: threadMetres(metrics.seamCm),
      labourMin: estimateLabourMinutes(metrics.seamCm),
      labourRate: 15
    })
    const cw = stack.colorways()
    const colourways = (cw.length ? cw.map((c) => c.color) : lineupHues(l.data.color, 4)).map((hex) => ({
      hex: '#' + hex.toString(16).padStart(6, '0'),
      label: colorRefLabel(hex)
    }))
    const sheetCare = careLabel(l.fabric, { headwear: def.pieces.some((p) => p.kind === 'headTube') })
    const html = lineSheetHTML({
      name: def.name,
      styleRef: projectName || 'Untitled',
      hero: viewport.renderStill(900),
      fabricName: l.fabric.name,
      fibre: sheetCare.fibre,
      sizes: [...SIZES],
      colourways,
      specs: metrics.rows.slice(0, 6).map((r) => ({ label: r.label, cm: r.cm })),
      landedCost: cost.total,
      care: sheetCare.care
    })
    const bytes = new TextEncoder().encode(html)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'line-sheet'
    await saveFile(`${safe}-line-sheet.html`, bytes, [{ name: 'HTML document', extensions: ['html'] }])
    statusHandles?.setSelection('Line sheet exported — print to PDF')
  }

  // QC inspection sheet — the graded POM specs + tolerances as a measure-and-tick
  // sheet a factory QC line inspects the batch against.
  async function exportQcSheet(): Promise<void> {
    const l = stack.active
    const def = getGarment(l.data.garmentType)
    const pom = pomTable(def, l.data, mannequin.measurements, mannequin.colliders, faceRig.getHairstyle())
    const html = qcSheetHTML({
      name: def.name,
      styleRef: projectName || 'Untitled',
      size: l.data.size,
      fabricName: l.fabric.name,
      rows: pom.rows.map((r) => ({ label: r.label, specCm: r.bySize[l.data.size], tolCm: r.tolCm }))
    })
    const bytes = new TextEncoder().encode(html)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'qc'
    await saveFile(`${safe}-qc-${l.data.size}.html`, bytes, [{ name: 'HTML document', extensions: ['html'] }])
    statusHandles?.setSelection(`QC sheet — ${pom.rows.length} points @ ${l.data.size}`)
  }

  // Sample order — the colourway × size quantity request for a sample run
  // (pairs with the tech pack / QC sheet / line sheet).
  async function exportSampleOrder(): Promise<void> {
    const l = stack.active
    const def = getGarment(l.data.garmentType)
    const cw = stack.colorways()
    const colourways = (cw.length ? cw.map((c) => c.color) : [l.data.color]).map((hex) => ({
      hex: '#' + hex.toString(16).padStart(6, '0'),
      label: colorRefLabel(hex)
    }))
    const html = sampleOrderHTML({
      name: def.name,
      styleRef: projectName || 'Untitled',
      fabricName: l.fabric.name,
      fibre: careLabel(l.fabric).fibre,
      sizes: [...SIZES],
      colourways,
      baseSize: l.data.size
    })
    const bytes = new TextEncoder().encode(html)
    const safe = projectName.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'sample-order'
    await saveFile(`${safe}-sample-order.html`, bytes, [{ name: 'HTML document', extensions: ['html'] }])
    statusHandles?.setSelection(`Sample order — ${colourways.length} colourway(s)`)
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
    const appr = entryParams.get('approval')
    return {
      title: 'DesignIO outfit',
      approval: appr && (APPROVAL_STATUSES as string[]).includes(appr) ? { status: appr as ApprovalStatus, by: entryParams.get('approvedBy') ?? undefined, at: Date.now() } : undefined,
      body: { ...bodySize },
      layers: stack.layers.map((l) => {
        const def = getGarment(l.data.garmentType)
        // headwear is blocked to a shape (same headTube predicate the head-sizing POM
        // uses): its care label is shaping-aware, and its cost sheet uses a small-panel
        // yield + hat-specific trims (pom · wire · sweatband) instead of body panels.
        const headwear = def.pieces.some((p) => p.kind === 'headTube')
        const label = careLabel(l.fabric, { headwear })
        const parts: { part: string; fabric: string }[] = []
        if (l.data.partFabrics?.sleeves) parts.push({ part: 'sleeves', fabric: getFabric(l.data.partFabrics.sleeves.fabricId).name })
        if (l.data.partFabrics?.legs) parts.push({ part: 'legs', fabric: getFabric(l.data.partFabrics.legs.fabricId).name })
        if (l.data.partFabrics?.back) parts.push({ part: 'back', fabric: getFabric(l.data.partFabrics.back.fabricId).name })
        if (l.data.partFabrics?.legBack) parts.push({ part: 'legs back', fabric: getFabric(l.data.partFabrics.legBack.fabricId).name })
        const metrics = activeMetrics(l)
        const panels = garmentToPanels(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders).panels
        const markerLayout = nestMarker(panels, 140)
        const pieceCount = patternPieceCount(panels)
        // Only pieces cut on the fold are meant to mirror. A sleeve or a side panel
        // is asymmetric by design, and flagging those would drown the real signal.
        const symmetry = panels
          .filter((pn) => /front|back|yoke|collar/i.test(pn.name) && pn.cut === 1)
          .map((pn) => {
            const r = symmetryDeviation(pn.outline)
            return { name: pn.name, summary: symmetrySummary(r), ok: symmetryVerdict(r.maxDeviation) === 'symmetric' }
          })

        // check each piece's grain against how the nester actually laid it
        const grain = checkGrainlines(
          markerLayout.placements.map((pl) => ({ name: pl.name, grain: panels[pl.panel].grain, rotated: pl.rot }))
        )
        const identifiers = skuAndBarcode({
          style: getGarment(l.data.garmentType).name,
          colour: nearestNamedColor(l.data.color).code,
          size: l.data.size
        })
        // metal hardware trims implied by the construction: rivets on heavy hip-pocketed
        // (workwear) cloth, eyelets for a drawstring, snaps on a heavy front-closure placket
        const m = mannequin.measurements
        const heavy = l.fabric.gsm >= 280
        const hasLegs = def.pieces.some((p) => p.kind === 'legTubes')
        const hardware: { label: string }[] = hardwareBOM(
          hardwarePlacements({
            pockets: hasLegs ? pocketPlacements(def, m) : [],
            rivet: heavy && hasLegs,
            eyelet: !!l.data.drawstring,
            snap: heavy && !!l.data.closure && (def.closureStyle ?? 'button') !== 'zip',
            frontZ: m.chestR + 0.02,
            waistY: (m.chestY + m.hipY) / 2,
            neckY: m.chestY + 0.16,
            hemY: m.hipY - 0.05
          })
        )
        // a belted garment (waistband) draws its buckle from the strap hardware library
        if (l.data.waistband) hardware.push(...beltHardwareBOM(40))
        return {
          name: def.name,
          size: l.data.size,
          fabricName: l.fabric.name,
          gsm: l.fabric.gsm,
          color: l.data.color,
          colorRef: colorRefLabel(l.data.color),
          parts: parts.length ? parts : undefined,
          trim: l.data.trim ? getFabric(l.data.trimFabricId ?? l.data.fabricId).name : undefined,
          hardware: hardware.length ? hardware : undefined,
          // no explicit allowance → the seam type's recommended one (french/flat-fell need more)
          seam: l.data.seam ?? (l.data.stitch ? SEAM_TYPES[l.data.stitch.seamType].allowanceMm : 10),
          pieceCount,
          identifiers,
          grain,
          symmetry,
          stitch: l.data.stitch ? { summary: stitchSummary(l.data.stitch), spec: l.data.stitch } : undefined,
          // a zip closure resolves to a full zipper spec (gauge from weight, length from category)
          zipper: l.data.closure && (def.closureStyle ?? 'button') === 'zip' ? zipperSummary(zipperSpecFor(def.category, l.fabric.gsm)) : undefined,
          // a knit garment that tapers chest→waist is fully-fashioned (shaped by decreases)
          fullyFashioned: (() => {
            if (l.fabric.family !== 'knit') return undefined
            const chest = metrics.rows.find((r) => r.label === 'Chest')?.cm
            const waist = metrics.rows.find((r) => r.label === 'Waist')?.cm
            const length = metrics.rows.find((r) => r.label === 'Length')?.cm ?? 60
            if (chest == null || waist == null) return undefined
            const plan = fashioningPlan(chest, waist, length)
            return isFullyFashioned(plan) ? fashioningSummary(plan) : undefined
          })(),
          // a lined garment shows its fleece lining where it opens / folds back
          fleeceLining: l.data.lined ? fleeceLiningNote(fleeceRevealZones({ open: l.data.closureOpen, cuff: l.data.cuff, collar: l.data.collar, collarStyle: l.data.collarStyle })) : undefined,
          // convertible construction options for outerwear (roll-up/collar) + trousers (zip-off)
          convertible: (() => {
            const outer = def.category === 'outerwear'
            const bottom = def.category === 'bottom'
            if (!outer && !bottom) return undefined
            const note = convertibleNote(
              convertibleDetailsFor({
                hasSleeves: outer && def.pieces.some((p) => p.kind === 'sleeves'),
                hasLegs: bottom && def.pieces.some((p) => p.kind === 'legTubes'),
                collar: outer && !!l.data.collar
              })
            )
            return note || undefined
          })(),
          physical: l.data.physicalFabric ? physicalSummary(l.data.physicalFabric) : undefined,
          fibre: label.fibre,
          care: label.care,
          careSymbols: careSymbols(careInstructions(l.fabric)),
          metrics,
          pom: pomTable(def, l.data, mannequin.measurements, mannequin.colliders, faceRig.getHairstyle()),
          marker: markerLayout,
          cost: costRollup({
            freightPerUnit: DEFAULT_FREIGHT_PER_UNIT,
            dutyPct: DEFAULT_APPAREL_DUTY_PCT,
            fabricM: headwear
              ? headwearFabricM(metrics.fabricM2)
              : markerLayout
                ? markerLayout.lengthCm / 100
                : metrics.fabricM2 / 1.4,
            pricePerM: estimatedFabricPrice(l.fabric),
            threadM: threadMetres(metrics.seamCm),
            // a hat's notions: pom (pom beanie / chullo) + a sweatband under a stiff visor
            // every garment's trims, priced off the same card the tech pack prints,
            // plus the hat-specific notions where the garment is headwear
            trims: [...priceTrimLines(activeTrimCard(l)), ...(headwear ? headwearTrims({ pom: def.pom, sweatband: def.visor }) : [])],
            labourMin: estimateLabourMinutes(metrics.seamCm),
            labourRate: 15
          }),
          sustainability: (() => {
            const mono = !l.data.partFabrics || Object.values(l.data.partFabrics).every((pf) => !pf || fibreGroup(getFabric(pf.fabricId)) === fibreGroup(l.fabric))
            const passport = materialPassport(l.fabric, { monoMaterial: mono, recycled: l.data.recycledFabric, deadstock: l.data.deadstockFabric })
            return {
              passport,
              footprint: garmentFootprint(l.fabric, metrics.fabricM2, { deadstock: l.data.deadstockFabric }),
              circularScore: circularScore({
                monoMaterial: mono,
                recyclableGroup: passport.recyclable,
                recycled: !!l.data.recycledFabric,
                deadstock: !!l.data.deadstockFabric,
                hasClosure: !!l.data.closure,
                lined: !!l.data.lined || !!l.data.interfaced
              }),
              longevity: longevityCare(l.fabric)
            }
          })(),
          supplier: supplierFor(l.fabric),
          patternDxfAama: panelsToDXF(garmentToPanels(def, gradeParams(l.data), mannequin.measurements, mannequin.colliders), { aama: true }),
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
    delete: deleteGarment,
    glossary: openGlossary,
    palette: showCommandPalette
  }
  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (e.key === 'Escape' && shortcutsOpen()) return closeShortcuts()
    if (e.key === 'Escape' && sketchPadOpen()) return closeSketchPad()
    if (e.key === 'Escape' && tourOpen()) return closeTour()
    if (e.key === 'Escape' && whatsNewOpen()) return closeWhatsNew()
    if (e.key === 'Escape' && commandPaletteOpen()) return closeCommandPalette()
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
    onTemplates: () => openTemplates((tpl) => { const doc = currentDoc(); applyTemplateToLayer(doc.layers[doc.activeIndex] ?? doc.layers[0], tpl); pushUndo(); applyDoc(doc); showToast('Applied “' + tpl.name + '”', 'success') }),
    onShareLink: () => {
      const url = shareUrl(currentDoc(), location.href)
      void navigator.clipboard?.writeText(url).then(() => showToast('Share link copied to clipboard', 'success')).catch(() => showToast('Copy failed — link: ' + url, 'error'))
    },
    onOpenProject: () => void openProject(),
    onImportPattern: () => void importPattern(),
    onImportScan: () => void importBodyScan(),
    onImportMocap: () => void importMocap(),
    onExport: (fmt) => void doExport(fmt).catch(exportError),
    onRecordTurntable: recordTurntableSpin,
    onRecordTurntableSocial: (name) => recordTurntableSpin(name),
    onRecordTurntableBlur: () => recordTurntableSpin('native', true),
    onRecordSlowMo: () => {
      // quarter-speed sim while recording: 4× the temporal detail per played-back second
      loop.setTimeScale(0.25)
      statusHandles?.setSelection('Recording slow motion (0.25×)…')
      void recordClip(viewport.renderer.domElement, 6)
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'designio-slowmo.webm'
          a.click()
          setTimeout(() => URL.revokeObjectURL(url), 8000)
        })
        .catch((err) => showToast('Slow-mo record failed: ' + (err as Error).message, 'error'))
        .finally(() => {
          loop.setTimeScale(1)
          statusHandles?.setSelection('Slow-motion clip saved')
        })
    },
    onRunwayLineup: () => void exportRunwayLineup().catch((err) => showToast('Line-up failed: ' + (err as Error).message, 'error')),
    onScarfGiftFold: () => void exportScarfGiftFold().catch((err) => showToast('Gift-fold failed: ' + (err as Error).message, 'error')),
    onContactSheet: () => void exportContactSheet().catch((err) => showToast('Contact sheet failed: ' + (err as Error).message, 'error')),
    onSizeRunStrip: () => void exportSizeRunStrip().catch((err) => showToast('Size-run strip failed: ' + (err as Error).message, 'error')),
    onTwoAvatarScene: () => void exportTwoAvatarScene().catch((err) => showToast('Two-avatar scene failed: ' + (err as Error).message, 'error')),
    onViewer360: () => void exportViewer360().catch((err) => showToast('360° viewer failed: ' + (err as Error).message, 'error')),
    onLineSheet: () => void exportLineSheet().catch((err) => showToast('Line sheet failed: ' + (err as Error).message, 'error')),
    onQcSheet: () => void exportQcSheet().catch((err) => showToast('QC sheet failed: ' + (err as Error).message, 'error')),
    onSampleOrder: () => void exportSampleOrder().catch((err) => showToast('Sample order failed: ' + (err as Error).message, 'error')),
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
    onToggleWireframeOverlay: () => stack.setWireframeOverlay(!stack.wireframeOverlay),
    onStandardView: applyStandardView,
    onZoomToFit: zoomToFit,
    onToggleDensity: () => {
      shell.toggleDensity()
      showToast(shell.density() === 'compact' ? 'Compact panels' : 'Comfortable panels', 'info')
    },
    onToggleTheme: () => {
      shell.toggleTheme()
      showToast(shell.theme() === 'light' ? 'Light theme' : 'Dark theme', 'info')
    },
    onToggleMannequin: () => (mannequin.group.visible = !mannequin.group.visible),
    onMeasure: () => setMeasureMode(measureTool?.getMode() === 'measure' ? 'off' : 'measure'),
    onAnnotate: () => setMeasureMode(measureTool?.getMode() === 'annotate' ? 'off' : 'annotate'),
    onCameraBookmarks: () =>
      openCameraBookmarks({
        anatomy: anatomyShots(mannequin.measurements).map((shot) => ({ name: shot.name, go: () => viewport.setCameraPose(shot.pose) })),
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
    onToggleGhost: () => setGhostMode(!ghostOn),
    onToggleHanger: () => setHangerShot(!stack.hangerMode),
    onDrapeComparator: () => openDrapeComparator({ current: stack.active.fabric, library: FABRIC_LIBRARY }),
    onTogglePress: () => setPressMode(!pressMode),
    onToggleMeasureSnap: toggleMeasureSnap,
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
    onGlossary: openGlossary,
    onWhatsNew: openWhatsNew,
    onCommandPalette: showCommandPalette,
    onResetConstruction: resetActiveConstruction,
    onSurpriseMe: () => surpriseMe(),
    onVectorEditor: openVectorEditor,
    onReview: () => openReview(reviewStore),
    onTutorial: () => openTutorial(getTutorialContext),
    onLessons: openLessons,
    onChallenges: () => openChallenges((gid) => { garment.type = gid as GarmentType; Object.assign(garment, getGarment(gid).defaults); api.syncGarment(); applyGarmentEdit() }),
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
    getGarment(stack.active.data.garmentType).name, // seed the selection so it never flashes "No selection"
    [
      ...standardViews(mannequin.measurements).map((v) => ({ label: v.label, title: v.title, run: () => applyStandardView(v.id) })),
      { label: 'Fit', title: 'Zoom to fit the garment', run: zoomToFit }
    ]
  )

  /** Frame the figure dead-on from one of the four standard elevations. The pose is
   *  recomputed from the live measurements on every call, so it follows a resize or a
   *  body-type change instead of freezing at whatever the figure was on startup. */
  function applyStandardView(id: StandardViewId): void {
    const view = standardView(mannequin.measurements, id)
    if (view) viewport.setCameraPose(view.pose)
  }

  /** Pull back until everything worn is in frame, from wherever the camera already is.
   *  Falls back to framing the figure when nothing is worn, so the button is never a
   *  no-op that leaves the designer wondering whether it worked. */
  function zoomToFit(): void {
    const worn = visibleBounds(stack.getMeshesAll())
    const box = worn.isEmpty() ? visibleBounds([mannequin.group]) : worn
    const pose = fitPose(box, viewport.getCameraPose(), viewport.camera.fov, viewport.camera.aspect)
    if (pose) viewport.setCameraPose(pose)
  }

  // ---- control panel (docked into the right region) ----
  let syncBrowsers: () => void = () => {}
  const { panel, api } = createControlPanel({
    loop,
    viewport,
    wireframe: { get: () => stack.wireframe, set: (v) => stack.setWireframe(v) },
    wireframeOverlay: { get: () => stack.wireframeOverlay, set: (v) => stack.setWireframeOverlay(v) },
    onResetConstruction: resetActiveConstruction,
    hasPartOverrides: () => hasPartFabricOverrides(stack.active.data),
    onMatchPartsToBody: () => {
      const doc = currentDoc()
      const at = doc.activeIndex
      const layer = doc.layers[at]
      if (!layer) return
      const cleared = copyFabricToAllParts(layer)
      if (cleared === layer) return // nothing was overridden
      doc.layers[at] = cleared
      pushUndo()
      applyDoc(doc)
      showToast('All parts follow the body fabric', 'success')
    },
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
    onPreviewRepeat: () => {
      const l = stack.active
      if (!l.data.textile) return showToast('Pick a textile pattern first', 'info')
      const chest = activeMetrics(l).rows.find((r) => r.label === 'Chest' || r.label === 'Waist')
      openRepeatPreview({ pattern: l.data.textile, baseColor: l.data.color, girthCm: chest?.cm ?? 94 })
    },
    onPatternEdit: () => {
      patternCtl?.build(patternParams)
      centerTabs.refresh()
    },
    onResew: () => patternCtl?.resew(),
    // sketch a freeform panel → sew it (the pattern section is only visible in
    // Pattern mode, so patternCtl exists when this fires)
    onDrawPanel: () => openSketchPad((outline) => patternCtl?.buildDrawn(outline, patternParams)),
    onDrop: () => (mode === 'templates' ? stack.redrapeActive() : patternCtl?.resew()),
    recommendSize: () => {
      const l = stack.active
      const pom = pomTable(getGarment(l.data.garmentType), l.data, mannequin.measurements, mannequin.colliders, faceRig.getHairstyle())
      return sizeRecommendationReadout(recommendSize(bodyToMeasurements(bodySize), pom.rows))
    },
    heatmap: { get: () => stack.heatmap, set: (on) => { stack.setHeatmap(on); syncLegend() } },
    stress: { get: () => stack.stress, set: (on) => { stack.setStress(on); syncLegend() } },
    pressure: { get: () => stack.pressure, set: (on) => { stack.setPressure(on); syncLegend() } },
    utilisation: { get: () => stack.utilisation, set: (on) => { stack.setUtilisation(on); syncLegend() } },
    wrinkleMap: { get: () => stack.wrinkleMap, set: (on) => { stack.setWrinkleMap(on); syncLegend() } },
    tearing: { get: () => stack.tearing, set: (on) => stack.setTearing(on) },
    slip: { get: () => slipLayerRef !== null, set: (on) => setSlip(on) },
    wrinkles: { get: () => stack.wrinkles, set: (on) => stack.setWrinkles(on) },
    accessories: { get: (k) => accessories.isEnabled(k), set: (k, on) => accessories.setEnabled(k, on) },
    brim: { get: () => accessories.getBrim(), set: (p) => accessories.setBrim(p) },
    crown: { get: () => accessories.getCrown(), set: (s) => accessories.setCrown(s) },
    hatBand: { get: () => accessories.getHatBand(), set: (p) => accessories.setHatBand(p) },
    capBill: { get: () => accessories.getCapBill(), set: (p) => accessories.setCapBill(p) },
    capPanels: { get: () => accessories.getCapPanels(), set: (n) => accessories.setCapPanels(n) },
    puffLogo: { get: () => accessories.getPuffLogo(), set: (p) => accessories.setPuffLogo(p) },
    boonieSnap: { get: () => accessories.getBoonieSnap(), set: (s) => accessories.setBoonieSnap(s) },
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
      windTurb = p.turbulence ?? 0
      stack.setWind(p.x, p.z, windTurb)
      patternCtl?.setWind(p.x, p.z)
      return { x: p.x, z: p.z }
    },
    onExport: (fmt) => void doExport(fmt).catch(exportError),
    anim,
    onSetAnimMode: setAnimMode,
    onSetPose: setPose,
    onSetPosture: (name) => mannequin.setPosture(name),
    onSetWalkStyle: (name) => mannequin.setWalkStyle(name),
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
        return p ? { kind: p.kind, x: p.x, y: p.y, scale: p.scale, rotation: p.rotation, text: p.text, color: p.color, part: p.part, style: p.style, opacity: p.opacity, blend: p.blend } : null
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
      },
      scale: {
        get: () => stack.active.data.textileScale ?? 1,
        set: (v) => {
          stack.active.data.textileScale = v === 1 ? undefined : v
          scheduleRefreshDesign()
        }
      },
      rotation: {
        get: () => stack.active.data.textileRotation ?? 0,
        set: (v) => {
          stack.active.data.textileRotation = v === 0 ? undefined : v
          scheduleRefreshDesign()
        }
      }
    },
    tartan: {
      get: () => stack.active.data.tartan,
      set: (t) => {
        stack.active.data.tartan = t
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
    weaveDraft: {
      get: () => stack.active.data.weaveDraft,
      set: (d) => {
        stack.active.data.weaveDraft = d
        if (d) stack.active.data.knitChart = undefined // one structure owns the surface
        stack.applyLook(stack.active)
      }
    },
    knitChart: {
      get: () => stack.active.data.knitChart,
      set: (c) => {
        stack.active.data.knitChart = c
        if (c) stack.active.data.weaveDraft = undefined // one structure owns the surface
        stack.applyLook(stack.active)
      }
    },
    colourwork: {
      get: () => stack.active.data.colourwork,
      set: (c) => {
        stack.active.data.colourwork = c // colour layer — composes with any structure
        stack.applyLook(stack.active)
      }
    },
    yarn: {
      get: () => stack.active.data.yarn,
      set: (y) => stack.setYarn(y) // re-derives the hand: look + drape together
    },
    colorways: {
      list: () =>
        stack.colorways().map((cw) => ({
          id: cw.id,
          name: cw.name,
          color: cw.color,
          tag: colourwayTag(cw)
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
      duplicate: (id) => {
        pushUndo()
        stack.duplicateColorway(id)
      },
      remove: (id) => {
        pushUndo()
        stack.deleteColorway(id)
      }
    },
    getMetrics: () => activeMetrics(),
    getContactArea: () => stack.contactArea(),
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
    onDelete: deleteGarment,
    onReorder: reorderLayers,
    onSurprise: () => surpriseMe()
  })
  shell.right.appendChild(panel)

  /**
   * Move a garment up or down the stack — layer order is wearing order, so this is
   * what puts a jacket over a shirt rather than under it. The selection follows the
   * row that was dragged, which is what the designer is looking at.
   */
  function reorderLayers(from: number, to: number): void {
    const doc = currentDoc()
    const moved = moveItem(doc.layers, from, to)
    if (moved === doc.layers) return // out of range, or dropped where it started
    doc.layers = moved
    doc.activeIndex = selectionAfterMove(doc.activeIndex, from, to)
    pushUndo()
    applyDoc(doc)
    syncBrowsers()
  }

  /**
   * Replace the active layer with a random but wearable design. Seeded so a result
   * can be reproduced — the seed goes in the toast and `?surprise=<seed>` replays it.
   * Built on `defaultLayer`, so the garment's own defaults fill in everything the
   * randomiser does not touch and the layer is always valid for its garment.
   */
  function surpriseMe(seed = Math.floor(Math.random() * 0xffffffff)): void {
    const choice = randomDesign(seededRandom(seed), [...GARMENT_IDS], FABRIC_LIBRARY.map((f) => f.id))
    if (!choice) return
    const doc = currentDoc()
    const at = doc.activeIndex
    const fresh = defaultLayer(choice.garmentType as GarmentType)
    fresh.fabricId = choice.fabricId
    fresh.color = choice.color
    fresh.length = choice.length
    fresh.ease = choice.ease
    fresh.flare = choice.flare
    fresh.neckline = choice.neckline
    fresh.visible = doc.layers[at]?.visible ?? true
    doc.layers[at] = fresh
    pushUndo()
    applyDoc(doc)
    showToast(`Surprise — ${getGarment(choice.garmentType as GarmentType).name} (seed ${seed})`, 'success')
  }

  /** Put the active layer's shape + construction back to the garment's defaults,
   *  keeping its fabric, colour, prints and saved colourways. Undoable like any edit. */
  function resetActiveConstruction(): void {
    const doc = currentDoc()
    const at = doc.activeIndex
    const layer = doc.layers[at] ?? doc.layers[0]
    if (!layer) return
    doc.layers[at] = resetConstruction(layer)
    pushUndo()
    applyDoc(doc)
    showToast('Construction reset to defaults', 'success')
  }

  /**
   * The command palette, over the same actions the Library tabs and the template
   * gallery already use — so finding a thing by name and clicking it in a tab end up
   * in exactly the same place. Declared as a function so the shortcut dispatcher and
   * the menu, both built above, can reach it.
   */
  function showCommandPalette(): void {
    openCommandPalette({
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
      applyTemplate: (tpl) => {
        const doc = currentDoc()
        applyTemplateToLayer(doc.layers[doc.activeIndex] ?? doc.layers[0], tpl)
        pushUndo()
        applyDoc(doc)
        showToast('Applied \u201c' + tpl.name + '\u201d', 'success')
      }
    })
  }

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
    l.data.easeChest = garment.easeChest
    l.data.easeWaist = garment.easeWaist
    l.data.easeHip = garment.easeHip
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
  if (params.get('probeHead')) {
    // **Head surface probe** — raycasts the rendered avatar laterally and from the
    // front at a ladder of heights, and logs the half-width / depth profile in head
    // frame units (origin = the head collider's `b`, unit = its radius).
    //
    // Accessories that sit ON the face — an ear stud, a hoop, a temple arm — have to
    // be placed against the *rendered* head, and that is the metaball ovoid or the
    // GLB mesh, neither of which is the head collider. This is how those constants
    // get calibrated instead of guessed.
    window.setTimeout(() => {
      const c0 = mannequin.colliders[0]
      const r = c0.radius
      const ray = new THREE.Raycaster()
      const hit = (from: THREE.Vector3, dir: THREE.Vector3): { d: number; n: string } | null => {
        ray.set(from, dir)
        // three.js does not skip hidden objects, and the hair/face rigs are parked
        // invisible — so ancestor visibility has to be checked by hand
        const shown = (o: THREE.Object3D): boolean => {
          for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false
          return true
        }
        const hits = ray.intersectObject(viewport.scene, true).filter((h) => {
          const o = h.object as THREE.Mesh
          return o.isMesh && shown(o) && !/floor|shadow|backdrop|reflector/i.test(o.name)
        })
        return hits.length ? { d: hits[0].distance, n: hits[0].object.name || hits[0].object.type } : null
      }
      const rows: Record<string, unknown>[] = []
      for (let y = 1.2; y >= -2.6; y -= 0.2) {
        const p = new THREE.Vector3(0, c0.b.y + r * y, 0)
        const side = hit(p.clone().setX(-3 * r), new THREE.Vector3(1, 0, 0))
        const front = hit(p.clone().setZ(3 * r), new THREE.Vector3(0, 0, -1))
        rows.push({
          y: +y.toFixed(2),
          halfWidth: side === null ? null : +((3 * r - side.d) / r).toFixed(3),
          sideHit: side?.n ?? null,
          front: front === null ? null : +((3 * r - front.d) / r).toFixed(3),
          frontHit: front?.n ?? null
        })
      }
      // a full hit list at ear height, so a stray mesh in the way is obvious
      const p0 = new THREE.Vector3(-3 * r, c0.b.y - r, 0)
      ray.set(p0, new THREE.Vector3(1, 0, 0))
      const all = ray.intersectObject(viewport.scene, true).map((h) => `${h.object.name || h.object.type}@${(-3 * r + h.distance).toFixed(3)}`)
      console.log('[capture-log] probeHead', JSON.stringify({ crown: c0.b.y, radius: r, atEar: all, rows }))
    }, 8000)
  }
  if (params.get('probeFoot')) {
    // **Cross-section probe** — fans rays horizontally out of a point and reports how
    // far the rendered avatar's surface is in each direction.
    //
    // That gives three things a capsule cannot: the limb's true radius there, how far
    // its centre is from the capsule's axis, and — at foot height — which way the foot
    // actually points, which is the direction of greatest reach. Feet toe out; a shoe
    // built square to the world sits across the foot it is supposed to be on.
    window.setTimeout(() => {
      const ray = new THREE.Raycaster()
      const shown = (o: THREE.Object3D): boolean => {
        for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false
        return true
      }
      const N = 24
      const fan = (p: THREE.Vector3): (number | null)[] =>
        Array.from({ length: N }, (_, k) => {
          const th = (k / N) * Math.PI * 2
          const d = new THREE.Vector3(Math.sin(th), 0, Math.cos(th)) // 0 = +z (front)
          ray.set(p.clone().addScaledVector(d, 0.4), d.clone().negate())
          const h = ray.intersectObject(viewport.scene, true).filter((q) => {
            const o = q.object as THREE.Mesh
            return o.isMesh && shown(o) && /^Beta_/.test(o.name || (o.parent?.name ?? ''))
          })
          return h.length ? +(0.4 - h[0].distance).toFixed(4) : null
        })
      const a = accessoryAnchors(mannequin.colliders)
      const spots: [string, THREE.Vector3][] = [
        ['ankleL', a.ankleL], ['ankleR', a.ankleR],
        ['footL', a.footL], ['footR', a.footR],
        ['shinL', a.ankleL.clone().setY(a.ankleL.y + 0.08)],
        ['neck', a.neck], ['chest', a.chest], ['waist', a.waist],
        ['soleL', a.footL.clone().setY(Math.max(0.03, a.footL.y) + 0.02)]
      ]
      try {
        const out = spots.map(([name, p]) => ({ name, at: [p.x, p.y, p.z].map((v) => +v.toFixed(3)), fan: fan(p) }))
        console.log('[capture-log] probeFoot', JSON.stringify(out))
      } catch (err) {
        console.log('[capture-log] probeFoot failed:', String(err))
      }
    }, 8000)
  }
  if (params.get('probeTaper')) {
    // **Limb taper probe** — walks a capsule from `a` past `b` and measures the
    // rendered limb's half-thickness at each step, front-to-back (the one direction
    // that never catches the torso or the other limb).
    //
    // A capsule has one radius, which has to enclose the whole limb, so it is the
    // CALF or the forearm's widest — never the joint. This says where the joint
    // actually is and how thin it actually gets.
    window.setTimeout(() => {
      const ray = new THREE.Raycaster()
      const shown = (o: THREE.Object3D): boolean => {
        for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false
        return true
      }
      const half = (p: THREE.Vector3, d: THREE.Vector3): number | null => {
        const one = (sign: number): number | null => {
          ray.set(p.clone().addScaledVector(d, sign * 0.35), d.clone().multiplyScalar(-sign))
          const h = ray.intersectObject(viewport.scene, true).filter((q) => {
            const o = q.object as THREE.Mesh
            return o.isMesh && shown(o) && /^Beta_/.test(o.name || (o.parent?.name ?? ''))
          })
          return h.length ? 0.35 - h[0].distance : null
        }
        const a = one(1)
        const b = one(-1)
        return a === null || b === null ? null : (a + b) / 2
      }
      const out: Record<string, unknown> = {}
      for (const [name, idx] of [['forearm', 6], ['lowerLeg', 8], ['forearmR', 10], ['lowerLegR', 12]] as const) {
        const c = mannequin.colliders[idx]
        const axis = c.b.clone().sub(c.a).normalize()
        const len = c.a.distanceTo(c.b)
        const d = new THREE.Vector3(0, 0, 1)
        d.addScaledVector(axis, -d.dot(axis)).normalize()
        out[name] = {
          capsuleR: +c.radius.toFixed(4),
          len: +len.toFixed(4),
          // t past 1 walks into the hand / foot beyond the capsule's distal point
          at: [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.25, 1.5, 1.8].map((t) => {
            const r = half(c.a.clone().addScaledVector(axis, len * t), d)
            return { t, r: r === null ? null : +r.toFixed(4) }
          })
        }
      }
      console.log('[capture-log] probeTaper', JSON.stringify(out))
    }, 8000)
  }
  if (params.get('probeAxes')) {
    // **Bone axis probe** — rotates one bone a known amount about each of its local
    // axes in turn and reports where the limb's tip ends up.
    //
    // A rig's bones have their own local frames and no convention says which way
    // they face. Authoring a static pose means knowing, for this rig, which axis
    // of `lArm` swings the arm forward and which lifts it sideways. Guessing puts
    // a hand through the chest.
    window.setTimeout(() => {
      const b = mannequin.glbBones?.() ?? {}
      const out: Record<string, unknown> = {}
      for (const key of ['lArm', 'lFore', 'lUpLeg', 'lLeg'] as const) {
        const bone = (b as Record<string, THREE.Object3D | undefined>)[key]
        const tipKey = { lArm: 'lFore', lFore: 'lHand', lUpLeg: 'lLeg', lLeg: 'lFoot' }[key]
        const tip = (b as Record<string, THREE.Object3D | undefined>)[tipKey]
        if (!bone || !tip) continue
        const base = tip.getWorldPosition(new THREE.Vector3())
        const rot = bone.rotation.clone()
        const row: Record<string, number[]> = { rest: [base.x, base.y, base.z].map((v) => +v.toFixed(3)) }
        for (const axis of ['x', 'y', 'z'] as const) {
          bone.rotation.copy(rot)
          bone.rotation[axis] += 0.6
          bone.updateWorldMatrix(true, true)
          const p = tip.getWorldPosition(new THREE.Vector3())
          row[axis] = [p.x - base.x, p.y - base.y, p.z - base.z].map((v) => +v.toFixed(3))
        }
        bone.rotation.copy(rot)
        bone.updateWorldMatrix(true, true)
        out[key] = row
      }
      console.log('[capture-log] probeAxes', JSON.stringify(out))
    }, 8000)
  }
  if (params.get('probeBones')) {
    // Which standard bones the rig actually resolved to, and where. A missing one
    // makes `fitCollidersToGlb` skip that capsule silently, leaving it at its
    // procedural default — which is how a sleeve ends up on a phantom arm.
    window.setTimeout(() => {
      const names: string[] = []
      viewport.scene.traverse((o) => { if ((o as THREE.Bone).isBone) names.push(o.name) })
      console.log('[capture-log] probeBones', JSON.stringify({
        armBones: names.filter((n) => /arm|hand|shoulder/i.test(n)).slice(0, 24),
        caps: mannequin.colliders.map((c, i) => ({ i, a: [c.a.x, c.a.y].map((v) => +v.toFixed(3)), b: [c.b.x, c.b.y].map((v) => +v.toFixed(3)) }))
      }))
    }, 8000)
  }
  if (params.get('probeBody')) {
    // **Body silhouette probe** — the rendered avatar's outer and inner surface on
    // each side, at a ladder of heights, so a limb's true girth at a landmark can be
    // read off instead of taken from the capsule that merely encloses it.
    window.setTimeout(() => {
      const ray = new THREE.Raycaster()
      const shown = (o: THREE.Object3D): boolean => {
        for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false
        return true
      }
      const skin = (q: THREE.Intersection): boolean => {
        const o = q.object as THREE.Mesh
        return o.isMesh && shown(o) && /^Beta_/.test(o.name || (o.parent?.name ?? ''))
      }
      const castX = (y: number, fromX: number, dir: number): number | null => {
        ray.set(new THREE.Vector3(fromX, y, 0), new THREE.Vector3(dir, 0, 0))
        const h = ray.intersectObject(viewport.scene, true).filter(skin)
        return h.length ? fromX + dir * h[0].distance : null
      }
      const rows: Record<string, unknown>[] = []
      for (let y = 1.75; y >= 0.02; y -= 0.05) {
        const outR = castX(y, 0.8, -1) // right side, from outside in
        const inR = castX(y, 0, 1) // right side, from the midline out
        rows.push({
          y: +y.toFixed(2),
          outer: outR === null ? null : +outR.toFixed(4),
          inner: inR === null ? null : +inR.toFixed(4),
          r: outR === null || inR === null ? null : +((outR - inR) / 2).toFixed(4)
        })
      }
      const caps = mannequin.colliders.map((c, i) => ({ i, ay: +c.a.y.toFixed(3), by: +c.b.y.toFixed(3), ax: +c.a.x.toFixed(3), bx: +c.b.x.toFixed(3), r: +c.radius.toFixed(4) }))
      console.log('[capture-log] probeBody', JSON.stringify({ caps, rows }))
    }, 8000)
  }
  if (params.get('probeLimb')) {
    // **Limb surface probe** — measures the rendered avatar's true radius at the
    // wrist, hand and ankle, against the collider capsule's radius there.
    //
    // A limb collider is a uniform capsule standing in for a tapering limb, so its
    // radius is not the girth at any particular point. Anything sized to a joint — a
    // watch case, a sock cuff, a glove — needs the real one, and this is where it
    // comes from rather than an assumed anthropometric ratio.
    window.setTimeout(() => {
      const ray = new THREE.Raycaster()
      const shown = (o: THREE.Object3D): boolean => {
        for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false
        return true
      }
      const surface = (p: THREE.Vector3, d: THREE.Vector3): number | null => {
        ray.set(p.clone().addScaledVector(d, 0.3), d.clone().negate())
        const h = ray.intersectObject(viewport.scene, true).filter((q) => {
          const o = q.object as THREE.Mesh
          return o.isMesh && shown(o) && /^Beta_/.test(o.name || (o.parent?.name ?? ''))
        })
        return h.length ? 0.3 - h[0].distance : null
      }
      const a = accessoryAnchors(mannequin.colliders, mannequin.extremities())
      const spots: { name: string; at: THREE.Vector3; axis: THREE.Vector3; capsuleR: number }[] = [
        { name: 'wristL', at: a.wristL, axis: a.foreArmDirL, capsuleR: mannequin.colliders[6].radius },
        { name: 'handL', at: a.handL, axis: a.foreArmDirL, capsuleR: mannequin.colliders[6].radius },
        { name: 'ankleL', at: a.ankleL, axis: a.lowerLegDirL, capsuleR: mannequin.colliders[8].radius },
        { name: 'footL', at: a.footL, axis: a.lowerLegDirL, capsuleR: mannequin.colliders[8].radius }
      ]
      const rows = spots.map((s) => {
        const out: Record<string, unknown> = { at: s.name, capsuleR: +s.capsuleR.toFixed(4) }
        for (const [label, dir] of [['lateral', new THREE.Vector3(1, 0, 0)], ['front', new THREE.Vector3(0, 0, 1)]] as const) {
          const d = new THREE.Vector3().copy(dir)
          const m = d.clone().addScaledVector(s.axis, -d.dot(s.axis)).normalize()
          const plus = surface(s.at, m)
          const minus = surface(s.at, m.clone().negate())
          out[label] = plus === null || minus === null ? null : +(((plus + minus) / 2)).toFixed(4)
        }
        return out
      })
      const fmt = (v: THREE.Vector3) => [v.x, v.y, v.z].map((q) => +q.toFixed(3))
      // how far the hand and the foot reach BEYOND the capsule's distal cap: the
      // capsule stops at the palm, but a glove has to cover the fingers
      const reach = (from: THREE.Vector3, dir: THREE.Vector3): number | null => {
        // cast back along the limb from well past the extremity
        const far = from.clone().addScaledVector(dir, 0.4)
        ray.set(far, dir.clone().negate())
        const h = ray.intersectObject(viewport.scene, true).filter((q) => {
          const o = q.object as THREE.Mesh
          return o.isMesh && shown(o) && /^Beta_/.test(o.name || (o.parent?.name ?? ''))
        })
        return h.length ? 0.4 - h[0].distance : null
      }
      const capL = mannequin.colliders[6]
      const capLeg = mannequin.colliders[8]
      const extents = {
        // measured from the capsule's distal point `b`, in capsule radii
        handBeyondB: (() => { const d = reach(capL.b, a.foreArmDirL); return d === null ? null : +(d / capL.radius).toFixed(3) })(),
        footBeyondB: (() => { const d = reach(capLeg.b, a.lowerLegDirL); return d === null ? null : +(d / capLeg.radius).toFixed(3) })(),
        // and the foot's forward reach (the toe), which is not along the leg axis
        toeReach: (() => { const d = reach(capLeg.b, new THREE.Vector3(0, 0, 1)); return d === null ? null : +(d / capLeg.radius).toFixed(3) })(),
        soleY: (() => { const d = reach(capLeg.b, new THREE.Vector3(0, -1, 0)); return d === null ? null : +(capLeg.b.y - d).toFixed(4) })(),
        ankleY: +a.ankleL.y.toFixed(4),
        legLen: +capLeg.a.distanceTo(capLeg.b).toFixed(4)
      }
      console.log('[capture-log] probeLimb', JSON.stringify({
        extents,
        rows,
        headFwd: fmt(a.headFwd),
        headRight: fmt(a.headRight),
        foreArmDirL: fmt(a.foreArmDirL),
        wristL: fmt(a.wristL),
        mount: fmt(radialMount(a.foreArmDirL, a.headFwd)),
        camera: fmt(viewport.camera.position),
        handL: fmt(a.handL), fingertipL: fmt(a.fingertipL), handDirL: fmt(a.handDirL),
        foreArmR: a.foreArmR, wristRj: a.wristR_,
        handLen: +a.handL.distanceTo(a.fingertipL).toFixed(4)
      }))
    }, 8000)
  }
  if (params.get('debugHead')) {
    console.log('[capture-log] debugHead armed')
    window.setTimeout(() => {
      try {
      const m = mannequin.measurements
      const c0 = mannequin.colliders[0]
      const piece = stack.active.controller.getPieces()[0]
      const pos = piece ? (piece.mesh.geometry.getAttribute('position').array as Float32Array) : null
      let minY = Infinity
      let maxY = -Infinity
      let cy = 0
      const n = pos ? pos.length / 3 : 0
      if (pos) {
        for (let k = 0; k < n; k++) {
          const y = pos[k * 3 + 1]
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
          cy += y
        }
      }
      // face-window census: is the front fabric ON the face (z past the skull) or gone?
      let faceFront = 0
      let faceBehind = 0
      let maxZ = -Infinity
      if (pos) {
        for (let k = 0; k < n; k++) {
          const x = pos[k * 3]
          const y = pos[k * 3 + 1]
          const z = pos[k * 3 + 2]
          if (Math.abs(x) < 0.06 && y > m.headBaseY - 0.03 && y < m.crownY - 0.02) {
            if (z > 0.055) faceFront++
            else if (z > -0.02) faceBehind++
            if (z > maxZ) maxZ = z
          }
        }
      }
      const pk = (stack.active as unknown as { pockets: { grp: { position: { x: number; y: number; z: number } }; x: number; y: number }[] }).pockets
      console.log('[capture-log]', JSON.stringify({
        pockets: pk?.map((q) => ({ rayY: q.y, at: [q.grp.position.x, q.grp.position.y, q.grp.position.z].map((v) => +v.toFixed(3)) })),
        crownY: m.crownY, headBaseY: m.headBaseY,
        cap0: { ay: c0.a.y, by: c0.b.y, r: c0.radius },
        face: { a: mannequin.colliders[14]?.a.y, az: mannequin.colliders[14]?.a.z, r: mannequin.colliders[14]?.radius },
        faceFront, faceBehind, maxZ,
        pieceY: pos ? { minY, maxY } : null
      }))
      } catch (err) {
        console.log('[capture-log] debugHead failed:', String(err))
      }
    }, 8000)
  }
  if (params.get('closeup') === 'head') {
    // the Face anatomy shot — frames the head for headwear verification
    // (?headDist=<m> tightens/loosens the framing)
    const pose = anatomyShots(mannequin.measurements)[0].pose
    const dist = parseFloat(params.get('headDist') ?? '')
    viewport.setCameraPose(Number.isFinite(dist) && dist > 0 ? { ...pose, distance: dist } : pose)
  }
  if (params.get('tour') === '1') window.setTimeout(() => startTour(), 500) // force the tour (verify/share)
  if (params.get('shortcuts') === '1') window.setTimeout(() => toggleShortcuts(), 500) // open the shortcut editor (verify/share)
  if (params.get('glossary') === '1') window.setTimeout(() => openGlossary(), 500) // open the term glossary
  if (params.get('whatsnew') === '1') window.setTimeout(() => openWhatsNew(), 500) // open the release feed
  if (params.get('palette') === '1') window.setTimeout(() => showCommandPalette(), 500) // open the command palette
  {
    const surprise = params.get('surprise')
    if (surprise !== null) {
      const seed = Number.parseInt(surprise, 10)
      if (Number.isFinite(seed)) surpriseMe(seed) // replay an exact random design
    }
  }
  if (params.get('review') === '1') window.setTimeout(() => openReview(reviewStore), 500) // open the design-review panel
  if (params.get('tutorial') === '1') window.setTimeout(() => openTutorial(getTutorialContext), 500) // open the interactive tutorial
  if (params.get('vectorEditor') === '1') window.setTimeout(() => openVectorEditor(), 500) // open the vector print editor
  if (params.get('lessons') === '1') window.setTimeout(() => openLessons(), 500) // open pattern-making lessons
  if (params.get('challenges') === '1') window.setTimeout(() => openChallenges(), 500) // open community challenges
  if (params.get('templates') === '1') window.setTimeout(() => openTemplates(), 500) // open the template gallery
  {
    const shareTok = shareTokenFrom(location.hash) ?? shareTokenFrom(location.search)
    if (shareTok) { try { applyDoc(decodeShare(shareTok)) } catch { /* corrupt/old share token — ignore */ } }
  }

  // First-run onboarding — a one-time guided tour on organic entry (never on a
  // snapshot deep-link, so captures/tests are untouched). Delayed so the shell
  // has laid out before the spotlight measures each region.
  if (!skipStart && !hasSeenTour()) {
    window.setTimeout(() => { if (!tourOpen()) startTour() }, 800)
  } else if (!skipStart && shouldAutoOpen(loadSeenRelease())) {
    // A returning designer gets the release feed once per update — never on a snapshot
    // deep-link, and never competing with the first-run tour.
    window.setTimeout(() => { if (!tourOpen()) openWhatsNew() }, 800)
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
// Plugin API — expose the registry globally + install the host so plugins can add
// fabrics; a plugin that registers before or after boot is applied immediately.
// NB: `window.designio` is the preload's file-IPC bridge (a read-only contextBridge
// property) — reassigning it THROWS and kills renderer boot. The plugin registry gets
// its own `designioPlugins` global, guarded so a locked-down host can never crash boot.
try {
  ;(globalThis as { designioPlugins?: unknown }).designioPlugins = { registerPlugin, loadedPlugins }
} catch {
  /* a frozen/locked-down host may forbid new globals; the in-process registry still works */
}
setPluginHost({
  addFabric: (f) => { if (!FABRIC_LIBRARY.some((x) => x.id === f.id)) FABRIC_LIBRARY.push(f) },
  addNamedColor: () => {},
  addTextileAlias: () => {}
})
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
  if (entryParams.get('prints') === 'puff') {
    cfg.prints.push({ ...newTextPrint('PUFF'), x: 0.25, y: 0.36, scale: 0.6, color: 0xffffff, style: 'puff' })
  }
  if (entryParams.get('prints') === 'discharge') {
    cfg.prints.push({ ...newTextPrint('FADE'), x: 0.25, y: 0.36, scale: 0.6, color: 0x101014, style: 'discharge' })
  }
  if (entryParams.get('prints') === 'foil') {
    cfg.prints.push({ ...newTextPrint('GOLD'), x: 0.25, y: 0.36, scale: 0.6, color: 0xd4af37, style: 'foil' })
  }
  if (entryParams.get('prints') === 'enamel-pin') {
    cfg.prints.push({ ...newTextPrint('★'), x: 0.28, y: 0.34, scale: 0.42, color: 0x1d4e89, style: 'enamel-pin' })
  }
  if (entryParams.get('prints') === 'woven') {
    cfg.prints.push({ ...newTextPrint('WOVEN'), x: 0.25, y: 0.36, scale: 0.6, color: 0xb5432f, style: 'woven' })
  }
  if (entryParams.get('prints') === 'blend') {
    // a translucent multiply print (tints into the weave) beside a 60%-opacity one
    cfg.prints.push({ ...newTextPrint('FADED'), x: 0.25, y: 0.34, scale: 0.55, color: 0x101014, blend: 'multiply' })
    cfg.prints.push({ ...newTextPrint('GHOST'), x: 0.25, y: 0.52, scale: 0.42, color: 0xffffff, opacity: 0.5 })
  }
  if (entryParams.get('collar')) cfg.collar = true
  const cs = entryParams.get('collarStyle')
  if (cs && (COLLAR_STYLES as string[]).includes(cs)) {
    cfg.collar = true
    cfg.collarStyle = cs as CollarStyle
  }
  const ss = entryParams.get('sleeveShape')
  if (ss && (SLEEVE_SHAPES as string[]).includes(ss)) cfg.sleeveShape = ss as SleeveShape
  const balFace = entryParams.get('balaclavaFace')
  if (balFace && (BALACLAVA_FACES as string[]).includes(balFace)) cfg.faceStyle = balFace as BalaclavaFace
  const bw = entryParams.get('balaclavaWorn')
  if (bw && (BALACLAVA_WORN as string[]).includes(bw)) cfg.balaclavaWorn = bw as BalaclavaWorn
  const cuffH = parseFloat(entryParams.get('cuffHeight') ?? '')
  if (Number.isFinite(cuffH)) cfg.cuffHeight = Math.max(0, Math.min(1, cuffH))
  const slch = parseFloat(entryParams.get('slouch') ?? '')
  if (Number.isFinite(slch)) cfg.slouch = Math.max(0, Math.min(1, slch))
  const pScale = parseFloat(entryParams.get('pomScale') ?? '')
  if (Number.isFinite(pScale)) cfg.pomScale = Math.max(0.4, Math.min(2, pScale))
  const pCol = entryParams.get('pomColor')
  if (pCol) cfg.pomColor = parseInt(pCol, 16)
  if (entryParams.get('pomFur') === '1') cfg.pomFur = true
  const sw = parseFloat(entryParams.get('scarfWidth') ?? '')
  if (Number.isFinite(sw)) cfg.scarfWidth = Math.max(0.5, Math.min(1.8, sw))
  if (entryParams.get('scarfPin')) cfg.scarfPin = true
  const wrapP = entryParams.get('wrapPreset')
  if (wrapP) {
    const preset = getWrapPreset(wrapP)
    if (preset) applyWrapPreset(cfg, preset)
  }
  if (entryParams.get('scarfKnot')) cfg.scarfKnot = true
  if (entryParams.get('scarfDouble')) cfg.scarfDouble = true
  if (entryParams.get('scarfBlanket')) cfg.scarfBlanket = true
  if (entryParams.get('scarfTuck')) cfg.scarfTuck = true
  const pa = parseFloat(entryParams.get('pinAt') ?? '')
  if (Number.isFinite(pa)) {
    cfg.scarfPin = true
    cfg.pinAt = Math.max(0.02, Math.min(0.45, pa))
  }
  const easeM = parseFloat(entryParams.get('ease') ?? '')
  if (Number.isFinite(easeM)) cfg.ease = Math.max(-0.03, Math.min(0.12, easeM))
  // ?block= — petite/tall/plus auto-proportioning: scale the garment length + ease
  const blockP = entryParams.get('block')
  if (blockP && (FIGURE_BLOCKS as string[]).includes(blockP)) applyFigureBlockToConfig(cfg, blockP as FigureBlock)
  if (entryParams.get('breath') === '1') cfg.breath = true
  if (entryParams.get('distressed') === '1') cfg.distressed = true
  const cvw = entryParams.get('convertibleWorn')
  if (cvw && (CONVERTIBLE_WORN as string[]).includes(cvw)) cfg.convertibleWorn = cvw as ConvertibleWorn
  const gw = entryParams.get('gaiterWorn')
  if (gw === 'up' || gw === 'down') cfg.gaiterWorn = gw
  const sw2 = entryParams.get('snoodWorn')
  if (sw2 === 'hood' || sw2 === 'cowl') cfg.snoodWorn = sw2
  const cpatch = entryParams.get('cuffPatch')
  if (cpatch === 'leather' || cpatch === 'woven') cfg.cuffPatch = cpatch
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
  const neckParam = entryParams.get('neckline')
  if (neckParam && ['scoop', 'crew', 'v', 'one-shoulder', 'strapless'].includes(neckParam)) cfg.neckline = neckParam as NecklineStyle
  if (entryParams.get('closure')) cfg.closure = true
  if (entryParams.get('crease')) cfg.crease = true
  for (const [q, k] of [['easeChest', 'easeChest'], ['easeWaist', 'easeWaist'], ['easeHip', 'easeHip']] as const) {
    const v = entryParams.get(q)
    if (v && Number.isFinite(+v)) cfg[k] = +v / 100 // cm in the URL → metres
  }
  if (entryParams.get('fringe')) cfg.fringe = true
  const hemShapeParam = entryParams.get('hemShape')
  // validate against the canonical list — a literal copy here silently dropped
  // ear-flap + point-front when the hem library grew (#317)
  if (hemShapeParam && (HEM_SHAPES as string[]).includes(hemShapeParam)) cfg.hemShape = hemShapeParam as HemShape
  if (entryParams.get('piping')) cfg.piping = true
  {
    // seam & topstitch spec: ?seamType= &needle= &spi= &threadWt=
    const stitch = parseStitchParams((k) => entryParams.get(k))
    if (stitch) cfg.stitch = stitch
    // physical fabric override: ?gsm= &thickMm= &bend= &stretchWarp= &stretchWeft= &shear=
    const phys = parsePhysicalParams((k) => entryParams.get(k), physicalDefaults(getFabric(cfg.fabricId ?? 'cotton-poplin')))
    if (phys) cfg.physicalFabric = phys
  }
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
  const txScale = parseFloat(entryParams.get('textileScale') ?? '')
  if (Number.isFinite(txScale)) cfg.textileScale = Math.max(0.25, Math.min(4, txScale))
  const txRot = parseFloat(entryParams.get('textileRotation') ?? '')
  if (Number.isFinite(txRot)) cfg.textileRotation = txRot
  const txRep = entryParams.get('textileRepeat')
  if (txRep && (REPEAT_MODES as string[]).includes(txRep)) cfg.textileRepeat = txRep as RepeatMode
  const tar = entryParams.get('tartan')
  if (tar && (TARTAN_KINDS as string[]).includes(tar)) cfg.tartan = tar as TartanKind
  const omb = entryParams.get('ombre')
  if (omb && (OMBRE_DIRECTIONS as string[]).includes(omb)) cfg.ombre = omb as OmbreDirection
  const wr = entryParams.get('wear')
  if (wr && (WEAR_KINDS as string[]).includes(wr)) cfg.wear = wr as WearKind
  const duo = entryParams.get('duotone')
  if (duo && (DUOTONE_KINDS as string[]).includes(duo)) cfg.duotone = duo as DuotoneKind
  const party = entryParams.get('partyFinish')
  if (party) {
    const preset = getPartyFinish(party)
    if (preset) applyPartyFinish(cfg, preset)
  }
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
  if (entryParams.get('reflectiveTrim')) {
    cfg.reflectiveTrim = true
    cfg.trim = true // reflective piping rides the contrast trim bands
  }
  if (entryParams.get('thermo')) {
    cfg.thermo = true
    const tw = entryParams.get('thermoWarm')
    if (tw) cfg.thermoWarm = parseInt(tw, 16)
    const tt = entryParams.get('thermoTemp')
    if (tt) cfg.thermoTemp = Math.max(0, Math.min(1, parseFloat(tt)))
  }
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
