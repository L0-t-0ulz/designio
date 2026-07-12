import * as THREE from 'three'
import type { Loop } from '../core/Loop'
import type { Viewport } from '../core/Viewport'
import type { GarmentType, SleeveStyle, CollarStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from '../garment/templates'
import { COLLAR_STYLES, SLEEVE_SHAPES, POCKET_STYLES, PLEAT_STYLES, FRILL_STYLES } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { AnimationMode, BodyParams, BodyType } from '../avatar/Mannequin'
import { SKIN_TONES, SKIN_TONE_HEX, UNDERTONES, type SkinTone, type Undertone } from '../avatar/skin'
import { POSES, type PoseName } from '../avatar/poses'
import { BODY_PRESETS, applyBodyPreset } from '../avatar/bodyPresets'
import { ACCESSORY_KINDS, type AccessoryKind } from '../avatar/accessories'
import { HAIRSTYLES, HAIRSTYLE_LABELS, type Hairstyle } from '../avatar/face'
import { SIM_RESOLUTIONS, type SimResolution } from '../cloth/simQuality'
import { LIGHTING_PRESETS, BACKDROP_PRESETS } from '../core/studioPresets'
import { TONE_MAPS, toneMappingMode, type ToneMapName } from '../core/tonemap'
import { WIND_PRESETS } from '../cloth/windPresets'
import {
  bodyToMeasurements,
  setMeasurement,
  applySizeRow,
  parseSizeChart,
  cmToIn,
  inToCm,
  STANDARD_SIZE_CHART,
  type MeasureKey,
  type SizeChartRow
} from '../avatar/measure'
import type { Fabric } from '../fabric/FabricLibrary'
import { getGarment } from '../garments/registry'
import { button, colorField, el, section, slider, textField, toggle, type Refreshable } from './controls'
import { patternSchematic } from './patternSchematic'
import { DEFAULT_GRADE_RULES, SIZES, type GradeRules, type SizeLabel } from '../studio/document'
import type { PartId } from '../studio/GarmentStack'
import type { GarmentMetrics } from '../export/garmentMetrics'
import type { GirthRow } from '../export/drapeFit'
import { TEXTILE_PATTERNS, type TextilePattern } from '../fabric/textile'
import { OMBRE_DIRECTIONS, type OmbreDirection } from '../fabric/ombre'
import { WEAR_KINDS, type WearKind } from '../fabric/wear'
import { SPARKLE_KINDS, type SparkleKind } from '../fabric/sparkle'
import { IRIDESCENT_KINDS, type IridescentKind } from '../fabric/iridescent'
import { QUILT_PATTERNS, type QuiltPattern } from '../fabric/quilt'
import { LACE_PATTERNS, type LacePattern } from '../fabric/lace'
import { FUR_KINDS, type FurKind } from '../fabric/fur'
import { NAMED_COLORS, nearestNamedColor, isExactNamedColor } from '../fabric/namedColors'
import type { PrintPart, PrintStyle } from '../start/design'

export interface GarmentState {
  type: GarmentType
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  sleeveShape?: SleeveShape
  size: SizeLabel
  gradeRules?: GradeRules
  collar?: boolean
  collarStyle?: CollarStyle
  cuff?: boolean
  pleats?: boolean
  pleatStyle?: PleatStyle
  crease?: boolean
  trouserBreak?: boolean
  fringe?: boolean
  dart?: boolean
  pocket?: boolean
  pocketStyle?: PocketStyle
  hem?: boolean
  closure?: boolean
  closureOpen?: boolean
  lined?: boolean
  interfaced?: boolean
  wet?: boolean
  puff?: boolean
  waistband?: boolean
  facing?: boolean
  drawstring?: boolean
  ruffles?: boolean
  frillStyle?: FrillStyle
  boning?: boolean
  ribbing?: boolean
  yoke?: boolean
  princess?: boolean
  seam?: number
  notches?: boolean
  trim?: boolean
}

export type DesignMode = 'templates' | 'pattern'
export type ExportFormat = 'glb' | 'usdz' | 'obj' | 'svg' | 'dxf' | 'pattern-tiled' | 'techpack' | 'json' | 'manufacture'

/** A placed print (logo/text) as shown in the Prints manager. */
export interface PrintItem {
  id: string
  kind: 'image' | 'text'
  label: string
}
/** A keyframe as shown in the timeline strip. */
export interface TimelineKfItem {
  id: string
  subject: string
  duration: number
  active: boolean
}
/** Drives the shot-sequencer timeline from the panel. */
export interface TimelineControls {
  list: () => TimelineKfItem[]
  add: () => void
  remove: (id: string) => void
  setDuration: (id: string, seconds: number) => void
  transport: (action: 'play' | 'pause' | 'stop') => void
  toggleLoop: () => boolean
  seek: (t: number) => void
  record: () => void
  state: () => { playing: boolean; loop: boolean; time: number; total: number }
  /** Called back on playback progress so the scrubber tracks. */
  subscribe: (cb: () => void) => void
}
/** A saved colorway as shown in the swatch grid. */
export interface ColorwayItem {
  id: string
  name: string
  /** Swatch base colour (0xRRGGBB). */
  color: number
  /** A short finish tag (textile/sparkle/quilt/trim), if any. */
  tag?: string
}
export interface PrintPatch {
  x?: number
  y?: number
  scale?: number
  rotation?: number
  text?: string
  color?: number
  part?: PrintPart
  style?: PrintStyle
}
/** Manage the garment's placed prints (multiple logos + text) from the studio. */
export interface PrintControls {
  list: () => PrintItem[]
  get: (id: string) => (PrintPatch & { kind: 'image' | 'text' }) | null
  addImage: (image: HTMLImageElement, name: string) => string
  addText: () => string
  update: (id: string, patch: PrintPatch) => void
  remove: (id: string) => void
}

export interface PanelOptions {
  loop: Loop
  viewport: Viewport
  /** Wireframe over the active/all garment material(s). */
  wireframe: { get: () => boolean; set: (v: boolean) => void }
  mannequin: THREE.Object3D
  fabrics: Fabric[]
  current: Fabric
  garment: GarmentState
  patternParams: { bust: number; length: number }
  mode: DesignMode
  onSetMode: (m: DesignMode) => void
  onSelectFabric: (id: string) => void
  onVisualEdit: () => void
  onPhysicsEdit: () => void
  onGarmentEdit: () => void
  onPatternEdit: () => void
  onResew: () => void
  onDrop: () => void
  /** Fit / tension heatmap toggle (visualise where a garment is tight vs loose). */
  heatmap?: { get: () => boolean; set: (on: boolean) => void }
  /** Strain-driven micro-wrinkle normals toggle (crisp folds on close-ups). */
  wrinkles?: { get: () => boolean; set: (on: boolean) => void }
  /** Stress / fit-failure viz toggle (where a too-tight garment would strain/fail). */
  stress?: { get: () => boolean; set: (on: boolean) => void }
  /** Pressure / contact fit map toggle (where the garment presses into the body). */
  pressure?: { get: () => boolean; set: (on: boolean) => void }
  /** Simulation resolution (particle count) + quality (substeps) for dense garments. */
  sim?: {
    resolution: { get: () => SimResolution; set: (r: SimResolution) => void }
    quality: { get: () => number; set: (t: number) => void }
  }
  onSetGravity: (y: number) => void
  onSetWind: (x: number, z: number) => void
  /** Apply a named wind preset (still / breeze / gust / runway) — returns its base vector. */
  onSetWindPreset?: (name: string) => { x: number; z: number } | void
  onExport: (format: ExportFormat) => void
  anim: { mode: AnimationMode; speed: number }
  onSetAnimMode: (m: AnimationMode) => void
  /** Apply a static lookbook pose (implies static mode). */
  onSetPose?: (name: PoseName) => void
  /** The shot-sequencer timeline (keyframe camera + pose, play/scrub, record WebM). */
  timeline?: TimelineControls
  onAnimSpeed: (v: number) => void
  onColor: (hex: number) => void
  /** Which garment part the colour/fabric edits target (Body/Sleeves/Legs/Trim). */
  onSelectPart?: (part: PartId) => void
  /** Add / adjust a printed graphic (PNG) + text on the garment (optional). */
  prints?: PrintControls
  /** The repeating textile pattern tiled across the whole garment (optional). */
  textile?: { get: () => TextilePattern | undefined; set: (t: TextilePattern | undefined) => void }
  /** A dip-dye / ombré gradient baked into the albedo (optional). */
  ombre?: { get: () => OmbreDirection | undefined; set: (d: OmbreDirection | undefined) => void }
  /** A distressed / washed / faded wear finish (optional). */
  wear?: { get: () => WearKind | undefined; set: (w: WearKind | undefined) => void }
  /** Import a fabric-swatch photo → a seamless tiling PBR material (optional). */
  swatch?: { active: () => boolean; set: (img: HTMLImageElement) => void; clear: () => void }
  /** A sparkle finish — sequins / beading / metallic foil (optional). */
  sparkle?: { get: () => SparkleKind | undefined; set: (k: SparkleKind | undefined) => void }
  /** An iridescent finish — soap-bubble / holographic / oil-slick colour shift (optional). */
  iridescent?: { get: () => IridescentKind | undefined; set: (k: IridescentKind | undefined) => void }
  /** A quilting finish — channel / diamond / box loft (optional). */
  quilt?: { get: () => QuiltPattern | undefined; set: (p: QuiltPattern | undefined) => void }
  /** A sheer lace / broderie finish — an alpha-cutout (optional). */
  lace?: { get: () => LacePattern | undefined; set: (p: LacePattern | undefined) => void }
  /** A faux-fur / shearling / fleece pile finish (optional). */
  fur?: { get: () => FurKind | undefined; set: (k: FurKind | undefined) => void }
  /** Saved colour/fabric variants of the design, compared in a swatch grid (optional). */
  colorways?: {
    list: () => ColorwayItem[]
    add: () => void
    apply: (id: string) => void
    remove: (id: string) => void
  }
  /** Live measurements of the active garment (for the Measurements readout). */
  getMetrics?: () => GarmentMetrics
  /** Chest/waist/hip girth measured on the live *draped* garment (on-body fit). */
  getDrapedFit?: () => GirthRow[]
  bodySize: BodyParams
  onBodySize: (b: BodyParams) => void
  onBodyMode: (realistic: boolean) => void
  /** The avatar's complexion — skin tone + undertone (optional). */
  skin?: {
    getTone: () => SkinTone | undefined
    getUndertone: () => Undertone
    set: (tone: SkinTone | undefined, undertone: Undertone) => void
  }
  /** Toggle worn accessories (shoes / belt / hat / bag) on the avatar. */
  accessories?: { get: (kind: AccessoryKind) => boolean; set: (kind: AccessoryKind, on: boolean) => void }
  /** Hair + face customization on the avatar. */
  hair?: {
    getStyle: () => Hairstyle
    setStyle: (s: Hairstyle) => void
    getColor: () => number
    setColor: (hex: number) => void
    getFace: () => boolean
    setFace: (on: boolean) => void
  }
  /** Studio lighting + backdrop presets. */
  scene?: {
    getLighting: () => string
    setLighting: (id: string) => void
    getBackdrop: () => string
    setBackdrop: (id: string) => void
  }
  /** Notify the shell of the current editor context (for the status bar). */
  onSelectContext?: (label: string) => void
  /** Return to the start page ("Design your piece"). */
  onBack?: () => void
}

/** A friendly custom control panel: design mode, garment/pattern, fabric, physics.
 * Every slider readout is click-to-type (exact values); a quick-edit toolbar over
 * the viewport mirrors the key controls in both 3D and 2D. */
/** Selection hooks the Library uses so it drives the same state as the panel. */
export interface PanelApi {
  selectGarment: (id: string) => void
  selectFabric: (id: string) => void
  setFigure: (t: BodyType) => void
  /** Refresh the panel's garment controls from the current state (e.g. after a preset). */
  syncGarment: () => void
  /** Reload every control from the current state (e.g. after switching active layer). */
  refresh: () => void
  /** Re-read the live measurements (e.g. after a garment/body/size edit). */
  refreshMetrics: () => void
  /** Switch the editor context (Garment / Avatar). */
  setContext: (c: 'garment' | 'avatar') => void
}

export function createControlPanel(opts: PanelOptions): { panel: HTMLElement; api: PanelApi } {
  const { current, garment, viewport } = opts
  const refreshers: Refreshable[] = []
  const track = (r: Refreshable): HTMLElement => {
    refreshers.push(r)
    return r.row
  }

  const panel = el('div', 'dio-panel')

  const header = el('div', 'dio-header')
  const heading = el('div')
  heading.append(el('div', 'dio-title', 'DesignIO'), el('div', 'dio-subtitle', 'Garment Studio'))
  header.append(el('div', 'dio-logo'), heading)
  if (opts.onBack) {
    const back = el('button', 'dio-back')
    back.type = 'button'
    back.title = 'Back to “Design your piece”'
    back.append(document.createTextNode('← Start'))
    back.addEventListener('click', () => opts.onBack!())
    header.append(back)
  }
  panel.append(header)

  // ---- design mode (Templates / Pattern) — garment context ----
  const modeRow = el('div', 'dio-actions')
  const modeBtns: Record<DesignMode, HTMLButtonElement> = {
    templates: button('Templates', () => switchMode('templates'), opts.mode === 'templates'),
    pattern: button('Pattern (sew)', () => switchMode('pattern'), opts.mode === 'pattern')
  }
  modeRow.append(modeBtns.templates, modeBtns.pattern)

  // The garment *picker* now lives in the Library; this map stays empty (syncGarment
  // just no-ops its highlight loop) but selectGarment/syncGarment remain the shared path.
  const garmentBtns = new Map<string, HTMLButtonElement>()

  // neckline picker (tops/dresses)
  const neckRow = el('div', 'dio-actions')
  neckRow.style.flexWrap = 'wrap'
  const necks: [string, NecklineStyle][] = [
    ['Scoop', 'scoop'],
    ['Crew', 'crew'],
    ['V', 'v'],
    ['None', 'strapless']
  ]
  const neckBtns = new Map<NecklineStyle, HTMLButtonElement>()
  for (const [name, n] of necks) {
    const b = button(name, () => { garment.neckline = n; syncNeckSleeve(); opts.onGarmentEdit() }, garment.neckline === n)
    neckBtns.set(n, b)
    neckRow.append(b)
  }

  // sleeve picker (tops/dresses)
  const sleeveRow = el('div', 'dio-actions')
  sleeveRow.style.flexWrap = 'wrap'
  const sleeves: [string, SleeveStyle][] = [
    ['No sleeve', 'none'],
    ['Short', 'short'],
    ['Long', 'long']
  ]
  const sleeveBtns = new Map<SleeveStyle, HTMLButtonElement>()
  for (const [name, s] of sleeves) {
    const b = button(name, () => { garment.sleeve = s; syncGarment(); opts.onGarmentEdit() }, garment.sleeve === s)
    sleeveBtns.set(s, b)
    sleeveRow.append(b)
  }

  // sleeve-shape picker (the sleeve library; shown when the garment has sleeves)
  const sleeveShapeLabels: Record<SleeveShape, string> = { 'set-in': 'Set-in', raglan: 'Raglan', dolman: 'Dolman', bishop: 'Bishop', puff: 'Puff', bell: 'Bell' }
  const sleeveShapeRow = el('div', 'dio-actions')
  sleeveShapeRow.style.flexWrap = 'wrap'
  const sleeveShapeBtns = new Map<SleeveShape, HTMLButtonElement>()
  for (const sh of SLEEVE_SHAPES) {
    const b = button(sleeveShapeLabels[sh], () => { garment.sleeveShape = sh; syncGarment(); opts.onGarmentEdit() }, (garment.sleeveShape ?? 'set-in') === sh)
    sleeveShapeBtns.set(sh, b)
    sleeveShapeRow.append(b)
  }
  const sleeveShapeBlock = el('div')
  sleeveShapeBlock.append(el('div', 'dio-field-label', 'Sleeve shape'), sleeveShapeRow)

  // frill picker (ruffles/flounces/godets; shown when the Ruffles detail is on)
  const frillLabels: Record<FrillStyle, string> = { ruffle: 'Ruffle', flounce: 'Flounce', godet: 'Godet' }
  const frillRow = el('div', 'dio-actions')
  frillRow.style.flexWrap = 'wrap'
  const frillBtns = new Map<FrillStyle, HTMLButtonElement>()
  for (const fr of FRILL_STYLES) {
    const b = button(frillLabels[fr], () => { garment.frillStyle = fr; syncGarment(); opts.onGarmentEdit() }, (garment.frillStyle ?? 'ruffle') === fr)
    frillBtns.set(fr, b)
    frillRow.append(b)
  }
  const frillBlock = el('div')
  frillBlock.append(el('div', 'dio-field-label', 'Frill style'), frillRow)

  // pleat picker (the pleats & gathers library; shown when the Pleats detail is on)
  const pleatLabels: Record<PleatStyle, string> = { knife: 'Knife', box: 'Box', accordion: 'Accordion', cartridge: 'Cartridge', gather: 'Gather', shirr: 'Shirring', smock: 'Smocking' }
  const pleatRow = el('div', 'dio-actions')
  pleatRow.style.flexWrap = 'wrap'
  const pleatBtns = new Map<PleatStyle, HTMLButtonElement>()
  for (const pl of PLEAT_STYLES) {
    const b = button(pleatLabels[pl], () => { garment.pleatStyle = pl; syncGarment(); opts.onGarmentEdit() }, (garment.pleatStyle ?? 'knife') === pl)
    pleatBtns.set(pl, b)
    pleatRow.append(b)
  }
  const pleatBlock = el('div')
  pleatBlock.append(el('div', 'dio-field-label', 'Pleat style'), pleatRow)

  // pocket picker (the pocket library; shown when the Pocket detail is on)
  const pocketLabels: Record<PocketStyle, string> = { patch: 'Patch', welt: 'Welt', jetted: 'Jetted', flap: 'Flap', bellows: 'Bellows' }
  const pocketRow = el('div', 'dio-actions')
  pocketRow.style.flexWrap = 'wrap'
  const pocketBtns = new Map<PocketStyle, HTMLButtonElement>()
  for (const ps of POCKET_STYLES) {
    const b = button(pocketLabels[ps], () => { garment.pocketStyle = ps; syncGarment(); opts.onGarmentEdit() }, (garment.pocketStyle ?? 'patch') === ps)
    pocketBtns.set(ps, b)
    pocketRow.append(b)
  }
  const pocketBlock = el('div')
  pocketBlock.append(el('div', 'dio-field-label', 'Pocket style'), pocketRow)

  // collar / lapel picker (shown when the Collar detail is on)
  const collarLabels: Record<CollarStyle, string> = { band: 'Band', shirt: 'Shirt', mandarin: 'Mandarin', peterpan: 'Peter-Pan', notch: 'Notch lapel' }
  const collarRow = el('div', 'dio-actions')
  collarRow.style.flexWrap = 'wrap'
  const collarBtns = new Map<CollarStyle, HTMLButtonElement>()
  for (const cstyle of COLLAR_STYLES) {
    const b = button(collarLabels[cstyle], () => { garment.collarStyle = cstyle; syncGarment(); opts.onGarmentEdit() }, (garment.collarStyle ?? 'band') === cstyle)
    collarBtns.set(cstyle, b)
    collarRow.append(b)
  }
  const collarBlock = el('div')
  collarBlock.append(el('div', 'dio-field-label', 'Collar / lapel'), collarRow)

  const lenS = slider({ label: 'Length', min: 0, max: 1, step: 0.01, fine: 0.005, get: () => garment.length, set: (v) => { garment.length = v; opts.onGarmentEdit() } })
  // min −3 cm = a compression fit: the garment is drafted smaller than the body and stretches over it
  const easeS = slider({ label: 'Looseness', min: -0.03, max: 0.12, step: 0.005, fine: 0.001, format: (v) => `${(v * 100) | 0} cm`, get: () => garment.ease, set: (v) => { garment.ease = v; opts.onGarmentEdit() } })
  const flareS = slider({ label: 'Flare', min: 0, max: 0.22, step: 0.005, fine: 0.001, format: (v) => `${(v * 100) | 0} cm`, get: () => garment.flare, set: (v) => { garment.flare = v; opts.onGarmentEdit() } })

  // size grade (XS…XXL) — grades the garment girth
  const sizeRow = el('div', 'dio-actions')
  sizeRow.style.flexWrap = 'wrap'
  const sizeBtns = new Map<SizeLabel, HTMLButtonElement>()
  const setSize = (s: SizeLabel): void => {
    garment.size = s
    for (const [ss, node] of sizeBtns) node.classList.toggle('primary', ss === s)
    opts.onGarmentEdit()
  }
  for (const s of SIZES) {
    const b = button(s, () => setSize(s), garment.size === s)
    sizeBtns.set(s, b)
    sizeRow.append(b)
  }
  const sizeBlock = el('div')
  sizeBlock.append(el('div', 'dio-field-label', 'Size'), sizeRow)

  // Grade rules — per-point increments (cm per size step) the size run grades by,
  // like a production grading table (girth-only by default).
  const rule = (k: keyof GradeRules): number => (garment.gradeRules ?? DEFAULT_GRADE_RULES)[k]
  const setRule = (k: keyof GradeRules, v: number): void => {
    garment.gradeRules = { ...DEFAULT_GRADE_RULES, ...garment.gradeRules, [k]: v }
    opts.onGarmentEdit()
  }
  const gradeGirthS = slider({ label: 'Girth / size', min: 0, max: 8, step: 0.5, fine: 0.1, format: (v) => `${v} cm`, get: () => rule('girthCm'), set: (v) => setRule('girthCm', v) })
  const gradeLenS = slider({ label: 'Length / size', min: 0, max: 5, step: 0.5, fine: 0.1, format: (v) => `${v} cm`, get: () => rule('lengthCm'), set: (v) => setRule('lengthCm', v) })
  const gradeSleeveS = slider({ label: 'Sleeve / size', min: 0, max: 5, step: 0.5, fine: 0.1, format: (v) => `${v} cm`, get: () => rule('sleeveCm'), set: (v) => setRule('sleeveCm', v) })
  const gradeBlock = el('div')
  gradeBlock.append(el('div', 'dio-field-label', 'Grade rules (cm / size step)'), gradeGirthS.row, gradeLenS.row, gradeSleeveS.row)

  function syncNeckSleeve(): void {
    for (const [n, node] of neckBtns) node.classList.toggle('primary', n === garment.neckline)
    for (const [s, node] of sleeveBtns) node.classList.toggle('primary', s === garment.sleeve)
    for (const [s, node] of sizeBtns) node.classList.toggle('primary', s === garment.size)
  }
  // Part selector (Body / Sleeves / Legs / Trim) — scopes colour + fabric to a part.
  let currentPart: PartId = 'body'
  const partRow = el('div', 'dio-seg dio-seg-wrap')
  function rebuildPartRow(): void {
    partRow.replaceChildren()
    const def = getGarment(garment.type)
    const hasLegs = def.pieces.some((p) => p.kind === 'legTubes')
    const parts: [string, PartId][] = [
      ['Body', 'body'],
      ['Back', 'back']
    ]
    if (def.supports.sleeve) parts.push(['Sleeves', 'sleeves'], ['Sleeves back', 'sleeveBack'])
    if (hasLegs) parts.push(['Legs', 'legs'], ['Legs back', 'legBack'])
    parts.push(['Trim', 'trim'])
    if (!parts.some(([, p]) => p === currentPart)) currentPart = 'body'
    for (const [label, p] of parts) {
      const b = el('button', 'dio-seg-btn' + (p === currentPart ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        currentPart = p
        for (const n of Array.from(partRow.children)) n.classList.remove('on')
        b.classList.add('on')
        opts.onSelectPart?.(p)
      })
      partRow.append(b)
    }
  }

  /** Reflect the selected garment: button primaries, supported controls, slider values. */
  function syncGarment(): void {
    const def = getGarment(garment.type)
    rebuildPartRow()
    for (const [id, node] of garmentBtns) node.classList.toggle('primary', id === garment.type)
    neckRow.classList.toggle('dio-hidden', !def.supports.neckline)
    sleeveRow.classList.toggle('dio-hidden', !def.supports.sleeve)
    lenS.row.classList.toggle('dio-hidden', !def.supports.length)
    easeS.row.classList.toggle('dio-hidden', !def.supports.ease)
    flareS.row.classList.toggle('dio-hidden', !def.supports.flare)
    for (const d of detailToggles) {
      d.t.row.classList.toggle('dio-hidden', !def.supports[d.key])
      d.t.refresh()
    }
    // "Worn open" shows only while a supported Closure is on
    openT.row.classList.toggle('dio-hidden', !def.supports.closure || !garment.closure)
    openT.refresh()
    // the collar/lapel library shows only when the Collar detail is supported + on
    collarBlock.classList.toggle('dio-hidden', !def.supports.collar || !garment.collar)
    for (const [cstyle, node] of collarBtns) node.classList.toggle('primary', (garment.collarStyle ?? 'band') === cstyle)
    // the sleeve library shows only when the garment has sleeves selected
    sleeveShapeBlock.classList.toggle('dio-hidden', !def.supports.sleeve || garment.sleeve === 'none')
    for (const [sh, node] of sleeveShapeBtns) node.classList.toggle('primary', (garment.sleeveShape ?? 'set-in') === sh)
    // the pocket library shows only when the Pocket detail is supported + on
    pocketBlock.classList.toggle('dio-hidden', !def.supports.pocket || !garment.pocket)
    for (const [ps, node] of pocketBtns) node.classList.toggle('primary', (garment.pocketStyle ?? 'patch') === ps)
    // the pleats library shows only when the Pleats detail is supported + on
    pleatBlock.classList.toggle('dio-hidden', !def.supports.pleats || !garment.pleats)
    for (const [pl, node] of pleatBtns) node.classList.toggle('primary', (garment.pleatStyle ?? 'knife') === pl)
    // the ruffles library shows only when the Ruffles detail is supported + on
    frillBlock.classList.toggle('dio-hidden', !def.supports.ruffles || !garment.ruffles)
    for (const [fr, node] of frillBtns) node.classList.toggle('primary', (garment.frillStyle ?? 'ruffle') === fr)
    syncNeckSleeve()
    lenS.refresh()
    easeS.refresh()
    flareS.refresh()
    gradeSleeveS.row.classList.toggle('dio-hidden', !def.supports.sleeve) // no sleeve rule without sleeves
    gradeGirthS.refresh()
    gradeLenS.refresh()
    gradeSleeveS.refresh()
  }
  function selectGarment(id: string): void {
    garment.type = id
    Object.assign(garment, getGarment(id).defaults) // apply the garment's starting fit/style
    syncGarment()
    opts.onGarmentEdit()
  }

  // construction detail toggles (collar · cuff · pleats · darts), shown per garment
  const detailDefs: [string, 'collar' | 'cuff' | 'pleats' | 'crease' | 'trouserBreak' | 'fringe' | 'dart' | 'pocket' | 'hem' | 'closure' | 'lined' | 'interfaced' | 'waistband' | 'facing' | 'drawstring' | 'ruffles' | 'boning' | 'ribbing' | 'yoke' | 'princess'][] = [
    ['Collar', 'collar'],
    ['Cuff', 'cuff'],
    ['Pleats', 'pleats'],
    ['Pressed crease', 'crease'],
    ['Break', 'trouserBreak'],
    ['Fringe', 'fringe'],
    ['Darts', 'dart'],
    ['Pocket', 'pocket'],
    ['Rolled hem', 'hem'],
    ['Closure', 'closure'],
    ['Lining', 'lined'],
    ['Interfacing', 'interfaced'],
    ['Waistband', 'waistband'],
    ['Facing', 'facing'],
    ['Drawstring', 'drawstring'],
    ['Ruffles', 'ruffles'],
    ['Boning', 'boning'],
    ['Ribbing', 'ribbing'],
    ['Yoke', 'yoke'],
    ['Princess', 'princess']
  ]
  const detailToggles = detailDefs.map(([label, key]) => ({
    key,
    t: toggle({
      label,
      get: () => !!garment[key],
      set: (v) => {
        garment[key] = v
        if (key === 'closure' && !v) garment.closureOpen = false // no closure → nothing to wear open (else it pops open on re-enable)
        syncGarment()
        opts.onGarmentEdit()
      }
    })
  }))
  // Functional opening — wear the closure unbuttoned/unzipped: the centre-front seam
  // is really unsewn, so the garment gaps and hangs open. Shows only while Closure is on.
  const openT = toggle({ label: 'Worn open', get: () => !!garment.closureOpen, set: (v) => { garment.closureOpen = v; syncGarment(); opts.onGarmentEdit() } })
  const detailRows = detailToggles.flatMap((d) => (d.key === 'closure' ? [d.t.row, openT.row] : [d.t.row]))
  const construction = section('Construction')
  construction.body.append(sizeBlock, gradeBlock, neckRow, sleeveRow, sleeveShapeBlock, lenS.row, easeS.row, flareS.row, ...detailRows, collarBlock, pocketBlock, pleatBlock, frillBlock)
  syncGarment()

  // ---- pattern (sew) ----
  const patternSec = section('Pattern')
  const schema = patternSchematic()
  const refreshSchema = (): void => schema.update(opts.patternParams.bust / 2, opts.patternParams.length)
  patternSec.body.append(
    schema.root,
    slider({ label: 'Bust circ.', min: 0.7, max: 1.5, step: 0.01, format: (v) => `${(v * 100) | 0} cm`, get: () => opts.patternParams.bust, set: (v) => { opts.patternParams.bust = v; refreshSchema(); opts.onPatternEdit() } }).row,
    slider({ label: 'Length', min: 0.3, max: 0.9, step: 0.01, format: (v) => `${(v * 100) | 0} cm`, get: () => opts.patternParams.length, set: (v) => { opts.patternParams.length = v; refreshSchema(); opts.onPatternEdit() } }).row,
    button('✂  Sew & simulate', () => opts.onResew())
  )
  refreshSchema()

  function switchMode(m: DesignMode): void {
    opts.mode = m
    modeBtns.templates.classList.toggle('primary', m === 'templates')
    modeBtns.pattern.classList.toggle('primary', m === 'pattern')
    construction.root.classList.toggle('dio-hidden', m !== 'templates')
    patternSec.root.classList.toggle('dio-hidden', m !== 'pattern')
    opts.onSetMode(m)
  }
  switchMode(opts.mode)

  // Shot-sequencer timeline — keyframe (camera + pose) chips, transport, scrubber, record.
  function timelineControls(tl: TimelineControls): HTMLElement {
    const root = el('div', 'dio-timeline')
    const strip = el('div', 'dio-tl-strip')
    const scrub = el('input', 'dio-tl-scrub') as HTMLInputElement
    scrub.type = 'range'
    scrub.min = '0'
    scrub.step = '0.01'
    const renderStrip = (): void => {
      strip.replaceChildren()
      const items = tl.list()
      if (!items.length) strip.append(el('div', 'dio-lib-empty', 'No keyframes — pose + frame the shot, then ＋ Keyframe'))
      items.forEach((it, i) => {
        const chip = el('div', 'dio-tl-kf' + (it.active ? ' on' : ''))
        const dur = el('input', 'dio-tl-dur') as HTMLInputElement
        dur.type = 'number'
        dur.step = '0.5'
        dur.min = '0.1'
        dur.value = String(it.duration)
        dur.title = 'Seconds to the next keyframe'
        dur.addEventListener('change', () => {
          const v = parseFloat(dur.value)
          if (Number.isFinite(v)) tl.setDuration(it.id, v)
        })
        const rm = el('button', 'dio-tl-rm', '×')
        rm.addEventListener('click', () => {
          tl.remove(it.id)
          renderStrip()
        })
        chip.append(el('span', 'dio-tl-lbl', `${i + 1} · ${it.subject}`), dur, rm)
        strip.append(chip)
      })
      scrub.max = String(Math.max(0.01, tl.state().total))
    }
    const transport = el('div', 'dio-actions')
    const playBtn = button('▶ Play', () => tl.transport(tl.state().playing ? 'pause' : 'play'))
    const loopBtn = button('Loop', () => loopBtn.classList.toggle('primary', tl.toggleLoop()))
    transport.append(
      button('＋ Keyframe', () => {
        tl.add()
        renderStrip()
      }),
      playBtn,
      button('■ Stop', () => tl.transport('stop')),
      loopBtn,
      button('● Record', () => tl.record())
    )
    scrub.addEventListener('input', () => tl.seek(parseFloat(scrub.value)))
    tl.subscribe(() => {
      const st = tl.state()
      playBtn.textContent = st.playing ? '❚❚ Pause' : '▶ Play'
      scrub.max = String(Math.max(0.01, st.total))
      if (document.activeElement !== scrub) scrub.value = String(st.time)
      for (const [i, chip] of Array.from(strip.querySelectorAll('.dio-tl-kf')).entries()) chip.classList.toggle('on', tl.list()[i]?.active ?? false)
    })
    renderStrip()
    root.append(el('div', 'dio-field-label', 'Timeline (shot sequencer)'), strip, scrub, transport)
    return root
  }

  // Made-to-measure — type real cm/in measurements + import a size chart; both drive
  // the mannequin through the same body params the sliders use.
  function madeToMeasure(): { root: HTMLElement; refresh: () => void } {
    const root = el('div', 'dio-mtm')
    let unit: 'cm' | 'in' = 'cm'
    root.append(el('div', 'dio-field-label', 'Made to measure'))
    const unitRow = el('div', 'dio-actions')
    const cmBtn = button('cm', () => setUnit('cm'), true)
    const inBtn = button('in', () => setUnit('in'), false)
    unitRow.append(cmBtn, inBtn)
    function setUnit(u: 'cm' | 'in'): void {
      unit = u
      cmBtn.classList.toggle('primary', u === 'cm')
      inBtn.classList.toggle('primary', u === 'in')
      refresh()
    }
    root.append(unitRow)

    const inputs = new Map<MeasureKey, HTMLInputElement>()
    for (const [key, label] of [['height', 'Height'], ['bust', 'Bust'], ['waist', 'Waist'], ['hips', 'Hips']] as [MeasureKey, string][]) {
      const rowEl = el('div', 'dio-row')
      const input = el('input', 'dio-mtm-num') as HTMLInputElement
      input.type = 'number'
      input.step = '0.5'
      input.addEventListener('change', () => {
        const v = parseFloat(input.value)
        if (!Number.isFinite(v)) return
        Object.assign(opts.bodySize, setMeasurement(opts.bodySize, key, unit === 'in' ? inToCm(v) : v))
        opts.onBodySize(opts.bodySize)
        refreshBody()
      })
      inputs.set(key, input)
      rowEl.append(el('label', undefined, label), input)
      root.append(rowEl)
    }

    // size-chart selector + paste importer
    let charts: SizeChartRow[] = [...STANDARD_SIZE_CHART]
    const select = el('select', 'dio-mtm-select') as HTMLSelectElement
    function fillSelect(): void {
      select.replaceChildren(el('option', undefined, 'Size chart…'))
      for (const r of charts) select.append(el('option', undefined, `${r.size} · ${r.bust}/${r.waist}/${r.hips}`))
    }
    select.addEventListener('change', () => {
      const row = charts[select.selectedIndex - 1]
      if (!row) return
      Object.assign(opts.bodySize, applySizeRow(opts.bodySize, row))
      opts.onBodySize(opts.bodySize)
      refreshBody()
      select.selectedIndex = 0
    })
    fillSelect()
    const ta = el('textarea', 'dio-mtm-import dio-hidden') as HTMLTextAreaElement
    ta.placeholder = 'Paste a size chart — JSON, or "Size,Bust,Waist,Hips" lines'
    const importRow = el('div', 'dio-actions')
    importRow.append(
      button('Import chart', () => ta.classList.toggle('dio-hidden')),
      button('Load', () => {
        const rows = parseSizeChart(ta.value)
        if (rows.length) {
          charts = rows
          fillSelect()
          ta.classList.add('dio-hidden')
        }
      })
    )
    root.append(select, importRow, ta)

    const refresh = (): void => {
      const m = bodyToMeasurements(opts.bodySize)
      for (const [key, input] of inputs) input.value = (unit === 'in' ? cmToIn(m[key]) : m[key]).toFixed(1)
    }
    refresh()
    return { root, refresh }
  }

  // ---- body / avatar ----
  const bodySec = section('Body')
  let realisticBody = true // the GLB avatar is the default body
  const figRow = el('div', 'dio-actions')
  const figBtns: Record<BodyType, HTMLButtonElement> = {
    female: button('Female', () => setFigure('female'), opts.bodySize.bodyType === 'female'),
    male: button('Male', () => setFigure('male'), opts.bodySize.bodyType === 'male')
  }
  function setFigure(t: BodyType): void {
    opts.bodySize.bodyType = t
    figBtns.female.classList.toggle('primary', t === 'female')
    figBtns.male.classList.toggle('primary', t === 'male')
    opts.onBodySize(opts.bodySize)
  }
  figRow.append(figBtns.female, figBtns.male)
  // Body-shape sliders (multipliers) — captured so made-to-measure edits refresh them.
  const bodyRefreshers: Refreshable[] = []
  const bodySlider = (label: string, key: keyof BodyParams, min: number, max: number, fmt: (v: number) => string): Refreshable => {
    const s = slider({ label, min, max, step: 0.01, format: fmt, get: () => opts.bodySize[key] as number, set: (v) => { (opts.bodySize[key] as number) = v; opts.onBodySize(opts.bodySize); refreshMeasure() } })
    bodyRefreshers.push(s)
    return s
  }
  const mtm = madeToMeasure()
  const refreshMeasure = (): void => mtm.refresh()
  const refreshBody = (): void => {
    for (const s of bodyRefreshers) s.refresh()
    mtm.refresh()
  }
  // Body-shape presets (diversity) — each applies a set of shape multipliers on top
  // of the current figure; garments refit via the same resize path as the sliders.
  const presetRow = el('div', 'dio-actions')
  presetRow.style.flexWrap = 'wrap'
  for (const preset of BODY_PRESETS) {
    const b = button(preset.label, () => {
      Object.assign(opts.bodySize, applyBodyPreset(opts.bodySize, preset))
      opts.onBodySize(opts.bodySize)
      refreshBody()
    })
    b.style.flex = '1 1 30%'
    presetRow.append(b)
  }
  // Accessories — footwear / belt / bag + headwear & neckwear worn on the avatar (toggle each).
  const accRow = el('div', 'dio-actions')
  accRow.style.flexWrap = 'wrap'
  const ACC_LABELS: Record<AccessoryKind, string> = {
    shoes: 'Shoes',
    belt: 'Belt',
    hat: 'Hat',
    bag: 'Bag',
    beanie: 'Beanie',
    cap: 'Cap',
    bucket: 'Bucket hat',
    balaclava: 'Ski mask',
    scarf: 'Scarf',
    gaiter: 'Neck gaiter'
  }
  if (opts.accessories) {
    for (const kind of ACCESSORY_KINDS) {
      const b = button(ACC_LABELS[kind], () => {
        const on = !opts.accessories!.get(kind)
        opts.accessories!.set(kind, on)
        b.classList.toggle('primary', on)
      }, opts.accessories.get(kind))
      b.style.flex = '1 1 22%'
      accRow.append(b)
    }
  }
  // Hair & face — a procedural hairstyle + colour and toggleable face features.
  const hairRow = el('div', 'dio-actions')
  hairRow.style.flexWrap = 'wrap'
  const hairBtns = new Map<Hairstyle, HTMLButtonElement>()
  if (opts.hair) {
    for (const style of HAIRSTYLES) {
      const b = button(HAIRSTYLE_LABELS[style], () => {
        opts.hair!.setStyle(style)
        for (const [s, btn] of hairBtns) btn.classList.toggle('primary', s === style)
      }, opts.hair.getStyle() === style)
      b.style.flex = '1 1 30%'
      hairBtns.set(style, b)
      hairRow.append(b)
    }
  }
  const hairFaceEls = opts.hair
    ? [
        el('div', 'dio-field-label', 'Hair'),
        hairRow,
        colorField({ label: 'Hair colour', get: () => opts.hair!.getColor(), set: (hex) => opts.hair!.setColor(hex) }).row,
        toggle({ label: 'Face features', get: () => opts.hair!.getFace(), set: (v) => opts.hair!.setFace(v) }).row
      ]
    : []

  // Complexion — a skin-tone swatch ramp (fair → deep) + a warm/neutral/cool undertone.
  function skinEls(sk: NonNullable<PanelOptions['skin']>): HTMLElement[] {
    const toneRow = el('div', 'dio-seg dio-seg-wrap')
    const chips = new Map<SkinTone | undefined, HTMLButtonElement>()
    const paint = (): void => {
      for (const [t, b] of chips) b.classList.toggle('on', t === sk.getTone())
    }
    const undertoneRow = el('div', 'dio-seg dio-seg-wrap')
    const UT_LABELS: Record<Undertone, string> = { warm: 'Warm', neutral: 'Neutral', cool: 'Cool' }
    const chip = (tone: SkinTone | undefined): HTMLButtonElement => {
      const b = el('button', 'dio-seg-btn' + (sk.getTone() === tone ? ' on' : ''), tone ? '' : 'Default') as HTMLButtonElement
      b.setAttribute('type', 'button')
      if (tone) {
        b.title = tone
        b.style.background = '#' + SKIN_TONE_HEX[tone].toString(16).padStart(6, '0')
        b.style.width = '22px'
        b.style.minWidth = '22px'
      }
      b.addEventListener('click', () => {
        sk.set(tone, sk.getUndertone())
        paint()
      })
      chips.set(tone, b)
      return b
    }
    toneRow.append(chip(undefined), ...SKIN_TONES.map((t) => chip(t)))
    for (const ut of UNDERTONES) {
      const b = el('button', 'dio-seg-btn' + (sk.getUndertone() === ut ? ' on' : ''), UT_LABELS[ut])
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        sk.set(sk.getTone(), ut)
        for (const n of Array.from(undertoneRow.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      undertoneRow.append(b)
    }
    return [el('div', 'dio-field-label', 'Complexion'), toneRow, el('div', 'dio-field-label', 'Undertone'), undertoneRow]
  }
  const skinControlEls = opts.skin ? skinEls(opts.skin) : []

  bodySec.body.append(
    figRow,
    toggle({ label: 'Imported body (GLB)', get: () => realisticBody, set: (v) => { realisticBody = v; opts.onBodyMode(v) } }).row,
    el('div', 'dio-field-label', 'Body shape'),
    presetRow,
    ...(opts.accessories ? [el('div', 'dio-field-label', 'Accessories'), accRow] : []),
    ...hairFaceEls,
    ...skinControlEls,
    bodySlider('Height', 'height', 0.85, 1.15, (v) => `${Math.round(v * 175)} cm`).row,
    bodySlider('Build', 'build', 0.8, 1.25, (v) => `${Math.round(v * 100)}%`).row,
    bodySlider('Bust', 'bust', 0.82, 1.25, (v) => `${Math.round(v * 100)}%`).row,
    bodySlider('Waist', 'waist', 0.78, 1.3, (v) => `${Math.round(v * 100)}%`).row,
    bodySlider('Hips', 'hips', 0.82, 1.3, (v) => `${Math.round(v * 100)}%`).row,
    mtm.root
  )
  // The fabric *gallery* now lives in the Library; keep selectFabric as the shared
  // path (the swatch map stays empty, so its highlight loop no-ops).
  const swatchEls = new Map<string, HTMLElement>()
  const selectSwatch = (id: string): void => {
    for (const [fid, node] of swatchEls) node.classList.toggle('selected', fid === id)
  }
  function selectFabric(id: string): void {
    opts.onSelectFabric(id)
    selectSwatch(id)
    refreshers.forEach((r) => r.refresh())
  }

  // ---- appearance ----
  // A repeating textile pattern (stripe/plaid/check/…) tiled across the whole garment.
  const TEXTILE_LABELS: Record<TextilePattern, string> = {
    stripe: 'Stripe', plaid: 'Plaid', check: 'Check', gingham: 'Gingham', polka: 'Polka', camo: 'Camo'
  }
  function textileControls(t: NonNullable<PanelOptions['textile']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, TextilePattern | undefined][] = [['None', undefined], ...TEXTILE_PATTERNS.map((p) => [TEXTILE_LABELS[p], p] as [string, TextilePattern])]
    for (const [label, pat] of choices) {
      const b = el('button', 'dio-seg-btn' + (t.get() === pat ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        t.set(pat)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Textile pattern'), row)
    return wrap
  }

  // A dip-dye / ombré gradient baked into the albedo (base → a deeper dipped tone).
  const OMBRE_LABELS: Record<OmbreDirection, string> = { 'top-down': 'Top-down', 'bottom-up': 'Bottom-up', radial: 'Radial' }
  function ombreControls(o: NonNullable<PanelOptions['ombre']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, OmbreDirection | undefined][] = [['None', undefined], ...OMBRE_DIRECTIONS.map((d) => [OMBRE_LABELS[d], d] as [string, OmbreDirection])]
    for (const [label, dir] of choices) {
      const b = el('button', 'dio-seg-btn' + (o.get() === dir ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        o.set(dir)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Dip-dye / ombré'), row)
    return wrap
  }

  // A distressed / washed / faded wear finish bleached into the albedo.
  const WEAR_LABELS: Record<WearKind, string> = { faded: 'Faded', 'acid-wash': 'Acid-wash', distressed: 'Distressed' }
  function wearControls(w: NonNullable<PanelOptions['wear']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, WearKind | undefined][] = [['None', undefined], ...WEAR_KINDS.map((k) => [WEAR_LABELS[k], k] as [string, WearKind])]
    for (const [label, kind] of choices) {
      const b = el('button', 'dio-seg-btn' + (w.get() === kind ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        w.set(kind)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Wash / distress'), row)
    return wrap
  }

  // A sparkle finish for eveningwear — sequins / beading / metallic foil.
  const SPARKLE_LABELS: Record<SparkleKind, string> = { sequins: 'Sequins', beading: 'Beading', foil: 'Foil' }
  function sparkleControls(sp: NonNullable<PanelOptions['sparkle']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, SparkleKind | undefined][] = [['None', undefined], ...SPARKLE_KINDS.map((k) => [SPARKLE_LABELS[k], k] as [string, SparkleKind])]
    for (const [label, kind] of choices) {
      const b = el('button', 'dio-seg-btn' + (sp.get() === kind ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        sp.set(kind)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Sparkle finish'), row)
    return wrap
  }

  // A colour-shifting iridescent finish — soap-bubble / holographic / oil-slick.
  const IRIDESCENT_LABELS: Record<IridescentKind, string> = { iridescent: 'Iridescent', holographic: 'Holographic', 'oil-slick': 'Oil-slick' }
  function iridescentControls(ir: NonNullable<PanelOptions['iridescent']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, IridescentKind | undefined][] = [['None', undefined], ...IRIDESCENT_KINDS.map((k) => [IRIDESCENT_LABELS[k], k] as [string, IridescentKind])]
    for (const [label, kind] of choices) {
      const b = el('button', 'dio-seg-btn' + (ir.get() === kind ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        ir.set(kind)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Iridescent finish'), row)
    return wrap
  }

  // A quilting finish — padded loft between stitch lines (channel / diamond / box).
  const QUILT_LABELS: Record<QuiltPattern, string> = { channel: 'Channel', diamond: 'Diamond', box: 'Box' }
  function quiltControls(q: NonNullable<PanelOptions['quilt']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, QuiltPattern | undefined][] = [['None', undefined], ...QUILT_PATTERNS.map((p) => [QUILT_LABELS[p], p] as [string, QuiltPattern])]
    for (const [label, pat] of choices) {
      const b = el('button', 'dio-seg-btn' + (q.get() === pat ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        q.set(pat)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Quilting'), row)
    return wrap
  }

  // A sheer lace / broderie finish — an alpha-cutout you can see through.
  const LACE_LABELS: Record<LacePattern, string> = { chantilly: 'Chantilly', geometric: 'Geometric', fishnet: 'Fishnet' }
  function laceControls(lc: NonNullable<PanelOptions['lace']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, LacePattern | undefined][] = [['None', undefined], ...LACE_PATTERNS.map((p) => [LACE_LABELS[p], p] as [string, LacePattern])]
    for (const [label, pat] of choices) {
      const b = el('button', 'dio-seg-btn' + (lc.get() === pat ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        lc.set(pat)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Lace / broderie'), row)
    return wrap
  }

  // A faux-fur / shearling / fleece pile finish.
  const FUR_LABELS: Record<FurKind, string> = { shearling: 'Shearling', 'faux-fur': 'Faux fur', fleece: 'Fleece' }
  function furControls(fr: NonNullable<PanelOptions['fur']>): HTMLElement {
    const wrap = el('div')
    const row = el('div', 'dio-seg dio-seg-wrap')
    const choices: [string, FurKind | undefined][] = [['None', undefined], ...FUR_KINDS.map((k) => [FUR_LABELS[k], k] as [string, FurKind])]
    for (const [label, kind] of choices) {
      const b = el('button', 'dio-seg-btn' + (fr.get() === kind ? ' on' : ''), label)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        fr.set(kind)
        for (const n of Array.from(row.children)) n.classList.remove('on')
        b.classList.add('on')
      })
      row.append(b)
    }
    wrap.append(el('div', 'dio-field-label', 'Faux fur / pile'), row)
    return wrap
  }

  // Import a fabric-swatch photo → a seamless tiling PBR material for the garment.
  function swatchControls(s: NonNullable<PanelOptions['swatch']>): HTMLElement {
    const wrap = el('div', 'dio-graphic')
    const fileInput = el('input') as HTMLInputElement
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.style.display = 'none'
    const actions = el('div', 'dio-actions')
    const importBtn = button('＋ Import fabric photo', () => fileInput.click())
    const removeBtn = button('Remove photo', () => { s.clear(); render() })
    function render(): void {
      actions.replaceChildren(importBtn)
      if (s.active()) actions.append(removeBtn)
    }
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0]
      if (!f || !f.type.startsWith('image/') || f.size > 12_000_000) return
      const img = new Image()
      const url = URL.createObjectURL(f)
      img.onload = () => {
        s.set(img)
        render()
        URL.revokeObjectURL(url) // the decoded bitmap is kept; free the blob URL
      }
      img.onerror = () => URL.revokeObjectURL(url) // a corrupt image still frees the blob URL
      img.src = url
    })
    render()
    wrap.append(el('div', 'dio-field-label', 'Fabric photo → tiling material'), actions, fileInput)
    return wrap
  }

  // The garment pieces a print can be placed on (body always; sleeves/legs if present).
  function printPartsFor(): [string, PrintPart][] {
    const def = getGarment(garment.type)
    const parts: [string, PrintPart][] = [['Body', 'body']]
    if (def.supports.sleeve) parts.push(['Sleeves', 'sleeves'])
    if (def.pieces.some((pc) => pc.kind === 'legTubes')) parts.push(['Legs', 'legs'])
    return parts
  }

  // Colorways — save the current look, then compare saved variants in a swatch grid.
  function colorwaysControls(cw: NonNullable<PanelOptions['colorways']>): HTMLElement {
    const wrap = el('div', 'dio-graphic')
    const grid = el('div', 'dio-cw-grid')
    const render = (): void => {
      grid.replaceChildren()
      const items = cw.list()
      if (!items.length) grid.append(el('div', 'dio-lib-empty', 'No colorways yet — save the current look'))
      for (const it of items) {
        const cell = el('div', 'dio-cw')
        const chip = el('button', 'dio-cw-chip')
        chip.style.background = '#' + (it.color >>> 0).toString(16).padStart(6, '0').slice(-6)
        chip.title = `Apply "${it.name}"${it.tag ? ` · ${it.tag}` : ''}`
        chip.setAttribute('type', 'button')
        chip.addEventListener('click', () => cw.apply(it.id))
        const rm = el('button', 'dio-cw-rm', '×')
        rm.title = 'Delete colorway'
        rm.addEventListener('click', (e) => {
          e.stopPropagation()
          cw.remove(it.id)
          render()
        })
        chip.append(rm)
        const name = el('div', 'dio-cw-name', it.name + (it.tag ? ` · ${it.tag}` : ''))
        cell.append(chip, name)
        grid.append(cell)
      }
    }
    const addRow = el('div', 'dio-actions')
    addRow.append(
      button('＋ Save current look', () => {
        cw.add()
        render()
      })
    )
    render()
    wrap.append(el('div', 'dio-field-label', 'Colorways'), grid, addRow)
    return wrap
  }

  // A named textile colour library — click a swatch to set the colour; the readout
  // shows the current colour's nearest production reference (exact, or ≈ nearest).
  function colorLibrary(): Refreshable {
    const row = el('div', 'dio-colorlib-row')
    const ref = el('div', 'dio-color-ref')
    const grid = el('div', 'dio-color-lib')
    for (const nc of NAMED_COLORS) {
      const chip = el('button', 'dio-swatch')
      chip.style.background = '#' + nc.hex.toString(16).padStart(6, '0')
      chip.title = `${nc.code} · ${nc.name}`
      chip.setAttribute('type', 'button')
      chip.addEventListener('click', () => {
        opts.onColor(nc.hex)
        refreshAll()
      })
      grid.append(chip)
    }
    const refresh = (): void => {
      const nc = nearestNamedColor(current.color)
      ref.textContent = `${isExactNamedColor(current.color) ? '' : '≈ '}${nc.code} · ${nc.name}`
    }
    refresh()
    row.append(ref, grid)
    return { row, refresh }
  }

  // Multiple placed prints (logos + text) — add, select, place (X/Y/size/rotation), remove.
  function printsControls(p: PrintControls): HTMLElement {
    const wrap = el('div', 'dio-graphic')
    let selectedId: string | null = null
    const listEl = el('div', 'dio-prints-list')
    const editor = el('div')
    const fileInput = el('input') as HTMLInputElement
    fileInput.type = 'file'
    fileInput.accept = 'image/png,image/jpeg,image/webp,image/*'
    fileInput.style.display = 'none'

    const renderEditor = (): void => {
      editor.replaceChildren()
      if (!selectedId) return
      const d = p.get(selectedId)
      if (!d) {
        selectedId = null
        return
      }
      const id = selectedId
      // Which garment piece this print sits on (only offered when there's a choice).
      const parts = printPartsFor()
      if (parts.length > 1) {
        const cur = p.get(id)?.part ?? 'body'
        const row = el('div', 'dio-seg dio-seg-wrap')
        for (const [label, pt] of parts) {
          const b = el('button', 'dio-seg-btn' + (cur === pt ? ' on' : ''), label)
          b.setAttribute('type', 'button')
          b.addEventListener('click', () => { p.update(id, { part: pt }); renderEditor() })
          row.append(b)
        }
        editor.append(el('div', 'dio-field-label', 'On part'), row)
      }
      // Finish: flat graphic · raised embroidery · appliqué patch.
      {
        const cur = p.get(id)?.style ?? 'flat'
        const row = el('div', 'dio-seg dio-seg-wrap')
        for (const [label, st] of [['Flat', 'flat'], ['Embroidery', 'embroidery'], ['Appliqué', 'applique']] as [string, PrintStyle][]) {
          const b = el('button', 'dio-seg-btn' + (cur === st ? ' on' : ''), label)
          b.setAttribute('type', 'button')
          b.addEventListener('click', () => { p.update(id, { style: st }); renderEditor() })
          row.append(b)
        }
        editor.append(el('div', 'dio-field-label', 'Finish'), row)
      }
      editor.append(
        slider({ label: 'Across (X)', min: 0, max: 1, step: 0.01, get: () => p.get(id)?.x ?? 0.5, set: (v) => p.update(id, { x: v }) }).row,
        slider({ label: 'Down (Y)', min: 0, max: 1, step: 0.01, get: () => p.get(id)?.y ?? 0.5, set: (v) => p.update(id, { y: v }) }).row,
        slider({ label: 'Size', min: 0.05, max: 0.9, step: 0.01, get: () => p.get(id)?.scale ?? 0.4, set: (v) => p.update(id, { scale: v }) }).row,
        slider({ label: 'Rotation', min: -180, max: 180, step: 1, format: (v) => `${v | 0}°`, get: () => p.get(id)?.rotation ?? 0, set: (v) => p.update(id, { rotation: v }) }).row
      )
      if (d.kind === 'text') {
        editor.append(
          textField({ label: 'Text', maxLength: 24, get: () => p.get(id)?.text ?? '', set: (v) => p.update(id, { text: v }) }).row,
          colorField({ label: 'Text colour', get: () => p.get(id)?.color ?? 0, set: (v) => p.update(id, { color: v }) }).row
        )
      }
    }
    const renderList = (): void => {
      listEl.replaceChildren()
      const items = p.list()
      if (!items.length) listEl.append(el('div', 'dio-lib-empty', 'No prints yet — add a logo or text'))
      for (const it of items) {
        const chip = el('div', 'dio-print-chip' + (it.id === selectedId ? ' on' : ''))
        const lbl = el('span', undefined, (it.kind === 'image' ? '🖼 ' : '🅣 ') + it.label)
        lbl.style.cursor = 'pointer'
        lbl.addEventListener('click', () => {
          selectedId = it.id
          renderList()
          renderEditor()
        })
        const rm = el('button', 'dio-print-rm', '×')
        rm.title = 'Remove'
        rm.addEventListener('click', (e) => {
          e.stopPropagation()
          p.remove(it.id)
          if (selectedId === it.id) selectedId = null
          renderList()
          renderEditor()
        })
        chip.append(lbl, rm)
        listEl.append(chip)
      }
    }
    const loadImage = (file: File): void => {
      if (!file.type.startsWith('image/') || file.size > 8_000_000) return
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        selectedId = p.addImage(img, file.name.slice(0, 16))
        renderList()
        renderEditor()
        URL.revokeObjectURL(url)
      }
      img.onerror = () => URL.revokeObjectURL(url) // a corrupt image still frees the blob URL
      img.src = url
    }
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0]
      if (f) loadImage(f)
    })
    const addRow = el('div', 'dio-actions')
    addRow.append(
      button('＋ Add graphic (PNG)', () => fileInput.click()),
      button('＋ Add text', () => {
        selectedId = p.addText()
        renderList()
        renderEditor()
      })
    )
    renderList()
    wrap.append(el('div', 'dio-field-label', 'Prints (logos + text)'), listEl, addRow, fileInput, editor)
    return wrap
  }

  const partBlock = el('div')
  partBlock.append(el('div', 'dio-field-label', 'Apply colour / fabric to'), partRow)
  const look = section('Appearance')
  look.body.append(
    partBlock,
    track(toggle({ label: 'Contrast trim', get: () => !!garment.trim, set: (v) => { garment.trim = v; opts.onGarmentEdit() } })),
    track(toggle({ label: 'Wet look', get: () => !!garment.wet, set: (v) => { garment.wet = v; opts.onGarmentEdit() } })),
    track(toggle({ label: 'Puffer loft', get: () => !!garment.puff, set: (v) => { garment.puff = v; opts.onGarmentEdit() } })),
    track(colorField({ label: 'Colour', get: () => current.color, set: (v) => opts.onColor(v) })),
    track(colorLibrary()),
    track(slider({ label: 'Roughness', min: 0, max: 1, step: 0.01, get: () => current.roughness, set: (v) => { current.roughness = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheen', min: 0, max: 1, step: 0.01, get: () => current.sheen, set: (v) => { current.sheen = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Weave density', min: 40, max: 400, step: 1, get: () => current.weaveScale, set: (v) => { current.weaveScale = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Weave depth', min: 0, max: 1.5, step: 0.01, get: () => current.normalStrength, set: (v) => { current.normalStrength = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheen streak', min: 0, max: 1, step: 0.01, get: () => current.anisotropy, set: (v) => { current.anisotropy = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheerness', min: 0, max: 1, step: 0.01, get: () => current.transmission, set: (v) => { current.transmission = v; opts.onVisualEdit() } }))
  )
  if (opts.textile) look.body.append(textileControls(opts.textile))
  if (opts.ombre) look.body.append(ombreControls(opts.ombre))
  if (opts.wear) look.body.append(wearControls(opts.wear))
  if (opts.sparkle) look.body.append(sparkleControls(opts.sparkle))
  if (opts.iridescent) look.body.append(iridescentControls(opts.iridescent))
  if (opts.quilt) look.body.append(quiltControls(opts.quilt))
  if (opts.lace) look.body.append(laceControls(opts.lace))
  if (opts.fur) look.body.append(furControls(opts.fur))
  if (opts.swatch) look.body.append(swatchControls(opts.swatch))
  if (opts.colorways) look.body.append(colorwaysControls(opts.colorways))
  if (opts.prints) look.body.append(printsControls(opts.prints))

  // ---- measurements (live production spec) ----
  const metricsSec = section('Measurements')
  let unit: 'cm' | 'in' = 'cm'
  const unitRow = el('div', 'dio-actions')
  const cmBtn = button('cm', () => setUnit('cm'), true)
  const inBtn = button('in', () => setUnit('in'), false)
  unitRow.append(cmBtn, inBtn)
  const metricsBody = el('div', 'dio-metrics')
  function setUnit(u: 'cm' | 'in'): void {
    unit = u
    cmBtn.classList.toggle('primary', u === 'cm')
    inBtn.classList.toggle('primary', u === 'in')
    renderMetrics()
  }
  const metricLine = (label: string, text: string): HTMLElement => {
    const row = el('div', 'dio-metric')
    row.append(el('span', 'dio-metric-label', label), el('span', 'dio-metric-val', text))
    return row
  }
  const fmtLen = (cm: number): string => (unit === 'cm' ? `${cm.toFixed(1)} cm` : `${(cm / 2.54).toFixed(1)} in`)
  // Signed fit ease: + = loose, − = tight (negative ease). Honours the cm/in toggle.
  const fmtEase = (cm: number): string => {
    const v = unit === 'cm' ? cm : cm / 2.54
    return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} ${unit}`
  }
  function renderMetrics(): void {
    metricsBody.replaceChildren()
    const m = opts.getMetrics?.()
    if (!m) {
      metricsBody.append(el('div', 'dio-lib-empty', 'Templates mode only'))
      return
    }
    for (const r of m.rows) metricsBody.append(metricLine(r.label, fmtLen(r.cm)))
    metricsBody.append(el('div', 'dio-metric-sep'))
    metricsBody.append(metricLine('Fabric', `${m.fabricM2.toFixed(2)} m²`))
    metricsBody.append(metricLine('Seam length', fmtLen(m.seamCm)))
    // Fit ease (garment − body) at chest/waist; tight (negative) ease flagged.
    if (m.ease.length) {
      metricsBody.append(el('div', 'dio-metric-sep'))
      metricsBody.append(el('div', 'dio-metric-head', 'Fit ease (drafted)'))
      for (const e of m.ease) {
        const row = metricLine(`${e.label} ease`, fmtEase(e.easeCm))
        if (e.easeCm < 0) row.classList.add('dio-metric-neg')
        metricsBody.append(row)
      }
    }
    // Girth measured on the live drape — a real hip the flat draft can't give.
    const draped = opts.getDrapedFit?.() ?? []
    if (draped.length) {
      metricsBody.append(el('div', 'dio-metric-sep'))
      metricsBody.append(el('div', 'dio-metric-head', 'On body (draped)'))
      for (const g of draped) metricsBody.append(metricLine(g.label, fmtLen(g.cm)))
    }
  }
  metricsSec.body.append(unitRow, metricsBody)
  if (opts.getMetrics) renderMetrics()

  // ---- fabric physics ----
  // ---- production (seam allowance + notches → the flat pattern) ----
  const production = section('Production', true)
  production.body.append(
    track(slider({ label: 'Seam allowance', min: 0, max: 25, step: 1, fine: 0.5, format: (v) => `${v | 0} mm`, get: () => garment.seam ?? 10, set: (v) => { garment.seam = v; opts.onGarmentEdit() } })),
    track(toggle({ label: 'Pattern notches', get: () => garment.notches !== false, set: (v) => { garment.notches = v; opts.onGarmentEdit() } }))
  )
  const cloth = section('Fabric physics', true)
  cloth.body.append(
    track(slider({ label: 'Weight', min: 30, max: 500, step: 1, format: (v) => `${v | 0} gsm`, get: () => current.gsm, set: (v) => { current.gsm = v; opts.onPhysicsEdit() } })),
    track(slider({ label: 'Stretch', min: 0, max: 1, step: 0.01, get: () => current.stretch, set: (v) => { current.stretch = v; opts.onPhysicsEdit() } })),
    track(slider({ label: 'Drape (soft)', min: 0, max: 1, step: 0.01, get: () => current.bendiness, set: (v) => { current.bendiness = v; opts.onPhysicsEdit() } })),
    track(slider({ label: 'Grip', min: 0, max: 1, step: 0.01, get: () => current.friction, set: (v) => { current.friction = v; opts.onPhysicsEdit() } }))
  )
  // ---- environment ----
  const env = section('Environment', true)
  let gravity = 9.81
  let windX = 0
  let windZ = 0
  const windXs = slider({ label: 'Wind ←→', min: -10, max: 10, step: 0.1, get: () => windX, set: (v) => { windX = v; opts.onSetWind(windX, windZ) } })
  const windZs = slider({ label: 'Wind ↕', min: -10, max: 10, step: 0.1, get: () => windZ, set: (v) => { windZ = v; opts.onSetWind(windX, windZ) } })
  // Wind presets — art-direct the 4D secondary motion (still / breeze / gust / runway).
  const windRow = el('div', 'dio-actions')
  windRow.style.flexWrap = 'wrap'
  if (opts.onSetWindPreset) {
    for (const p of WIND_PRESETS) {
      const b = button(p.label, () => {
        const base = opts.onSetWindPreset!(p.name)
        if (base) {
          windX = base.x
          windZ = base.z
          windXs.refresh()
          windZs.refresh()
        }
      })
      b.style.flex = '1 1 30%'
      windRow.append(b)
    }
  }
  // Studio lighting + backdrop presets (photo-studio looks the Environment applies).
  const lightRow = el('div', 'dio-actions')
  lightRow.style.flexWrap = 'wrap'
  const lightBtns = new Map<string, HTMLButtonElement>()
  const backdropRow = el('div', 'dio-actions')
  backdropRow.style.flexWrap = 'wrap'
  const backdropBtns = new Map<string, HTMLButtonElement>()
  const exposureRefresh: Refreshable[] = []
  if (opts.scene) {
    for (const p of LIGHTING_PRESETS) {
      const b = button(p.label, () => {
        opts.scene!.setLighting(p.id)
        for (const [id, btn] of lightBtns) btn.classList.toggle('primary', id === p.id)
        exposureRefresh.forEach((r) => r.refresh()) // preset sets exposure — sync the slider
      }, opts.scene.getLighting() === p.id)
      b.style.flex = '1 1 30%'
      lightBtns.set(p.id, b)
      lightRow.append(b)
    }
    for (const p of BACKDROP_PRESETS) {
      const b = button(p.label, () => {
        opts.scene!.setBackdrop(p.id)
        for (const [id, btn] of backdropBtns) btn.classList.toggle('primary', id === p.id)
      }, opts.scene.getBackdrop() === p.id)
      b.style.flex = '1 1 30%'
      backdropBtns.set(p.id, b)
      backdropRow.append(b)
    }
  }
  // Tone-mapping operator — ACES (default) · AgX · Neutral · Filmic · Reinhard.
  const TONEMAP_LABELS: Record<ToneMapName, string> = { aces: 'ACES', agx: 'AgX', neutral: 'Neutral', filmic: 'Filmic', reinhard: 'Reinhard' }
  const toneRow = el('div', 'dio-actions')
  toneRow.style.flexWrap = 'wrap'
  const toneBtns = new Map<ToneMapName, HTMLButtonElement>()
  for (const name of TONE_MAPS) {
    const b = button(TONEMAP_LABELS[name], () => {
      viewport.setToneMapping(name)
      for (const [id, btn] of toneBtns) btn.classList.toggle('primary', id === name)
    }, toneMappingMode(name) === viewport.renderer.toneMapping)
    b.style.flex = '1 1 30%'
    toneBtns.set(name, b)
    toneRow.append(b)
  }
  const exposureSlider = slider({ label: 'Exposure', min: 0.4, max: 2, step: 0.01, get: () => viewport.renderer.toneMappingExposure, set: (v) => (viewport.renderer.toneMappingExposure = v) })
  exposureRefresh.push(exposureSlider)
  env.body.append(
    ...(opts.scene ? [el('div', 'dio-field-label', 'Lighting'), lightRow, el('div', 'dio-field-label', 'Backdrop'), backdropRow] : []),
    slider({ label: 'Gravity', min: 0, max: 20, step: 0.1, get: () => gravity, set: (v) => { gravity = v; opts.onSetGravity(v) } }).row,
    ...(opts.onSetWindPreset ? [el('div', 'dio-field-label', 'Wind'), windRow] : []),
    windXs.row,
    windZs.row,
    el('div', 'dio-field-label', 'Tone-map'),
    toneRow,
    exposureSlider.row
  )
  // ---- animation ----
  const animSec = section('Animation', true)
  const animRow = el('div', 'dio-actions')
  animRow.style.flexWrap = 'wrap'
  const animModes: [string, AnimationMode][] = [
    ['Static', 'static'],
    ['Idle', 'idle'],
    ['Walk', 'walk'],
    ['Turn', 'turn']
  ]
  const animBtns = new Map<AnimationMode, HTMLButtonElement>()
  for (const [name, m] of animModes) {
    const b = button(name, () => {
      opts.anim.mode = m
      for (const [am, node] of animBtns) node.classList.toggle('primary', am === m)
      opts.onSetAnimMode(m)
    }, m === opts.anim.mode)
    b.style.flex = '1 1 42%'
    animBtns.set(m, b)
    animRow.append(b)
  }
  // Lookbook poses (static stances) — picking one switches to static mode.
  const poseRow = el('div', 'dio-actions')
  poseRow.style.flexWrap = 'wrap'
  const poseBtns = new Map<PoseName, HTMLButtonElement>()
  for (const pose of POSES) {
    const b = button(pose.label, () => {
      for (const [, node] of poseBtns) node.classList.remove('primary')
      b.classList.add('primary')
      for (const [am, node] of animBtns) node.classList.toggle('primary', am === 'static')
      opts.onSetPose?.(pose.name)
    })
    b.style.flex = '1 1 42%'
    poseBtns.set(pose.name, b)
    poseRow.append(b)
  }
  animSec.body.append(
    animRow,
    slider({ label: 'Speed', min: 0.2, max: 3, step: 0.1, get: () => opts.anim.speed, set: (v) => { opts.anim.speed = v; opts.onAnimSpeed(v) } }).row,
    el('div', 'dio-field-label', 'Pose (lookbook)'),
    poseRow
  )
  // (Export lives in the File menu; Re-drape + Play/Pause in the Scene group / status bar.)

  // ---- view ----
  const view = section('View', true)
  const homePos = viewport.camera.position.clone()
  const homeTarget = viewport.controls.target.clone()
  let closeup = false
  view.body.append(
    toggle({
      label: 'Macro close-up',
      get: () => closeup,
      set: (v) => {
        closeup = v
        if (v) {
          viewport.camera.position.set(0.12, 1.16, 0.62)
          viewport.controls.target.set(0, 1.08, 0.12)
        } else {
          viewport.camera.position.copy(homePos)
          viewport.controls.target.copy(homeTarget)
        }
        viewport.controls.update()
      }
    }).row,
    toggle({ label: 'Wireframe', get: () => opts.wireframe.get(), set: (v) => opts.wireframe.set(v) }).row,
    toggle({ label: 'Show mannequin', get: () => opts.mannequin.visible, set: (v) => (opts.mannequin.visible = v) }).row
  )

  // ---- Scene actions (re-drape) ----
  const redrapeRow = el('div', 'dio-actions')
  redrapeRow.append(button('⤓  Re-drape', () => opts.onDrop()))
  // Fit heatmap + Stress check + Pressure map share the strain overlay (mutually exclusive) → cross-refresh.
  const syncStrainToggles = (): void => {
    heatT?.refresh()
    stressT?.refresh()
    pressT?.refresh()
  }
  const heatT = opts.heatmap ? toggle({ label: 'Fit / tension heatmap', get: () => opts.heatmap!.get(), set: (v) => { opts.heatmap!.set(v); syncStrainToggles() } }) : null
  const stressT = opts.stress ? toggle({ label: 'Stress check (fit)', get: () => opts.stress!.get(), set: (v) => { opts.stress!.set(v); syncStrainToggles() } }) : null
  const pressT = opts.pressure ? toggle({ label: 'Pressure map (contact)', get: () => opts.pressure!.get(), set: (v) => { opts.pressure!.set(v); syncStrainToggles() } }) : null
  const heatmapRow = heatT ? heatT.row : el('div')
  const stressRow = stressT ? stressT.row : el('div')
  const pressureRow = pressT ? pressT.row : el('div')
  const wrinkleRow = opts.wrinkles
    ? toggle({ label: 'Micro-wrinkles', get: () => opts.wrinkles!.get(), set: (v) => opts.wrinkles!.set(v) }).row
    : el('div')
  // Simulation resolution (denser garments) + quality (substeps ↔ performance).
  const simSec = section('Simulation', true)
  if (opts.sim) {
    const resRow = el('div', 'dio-actions')
    resRow.style.flexWrap = 'wrap'
    const resBtns = new Map<SimResolution, HTMLButtonElement>()
    for (const r of SIM_RESOLUTIONS) {
      const b = button(r.label, () => {
        for (const [, node] of resBtns) node.classList.remove('primary')
        b.classList.add('primary')
        opts.sim!.resolution.set(r.name)
      }, opts.sim.resolution.get() === r.name)
      b.style.flex = '1 1 22%'
      resBtns.set(r.name, b)
      resRow.append(b)
    }
    simSec.body.append(
      el('div', 'dio-field-label', 'Resolution (particle density)'),
      resRow,
      slider({ label: 'Quality', min: 0, max: 1, step: 0.05, format: (v) => (v < 0.34 ? 'Perf' : v > 0.66 ? 'High' : 'Balanced'), get: () => opts.sim!.quality.get(), set: (v) => opts.sim!.quality.set(v) }).row
    )
  }

  // ---- context groups + tabs (Garment / Avatar / Scene) ----
  const garmentGroup = el('div')
  garmentGroup.append(modeRow, construction.root, patternSec.root, look.root, production.root, metricsSec.root, cloth.root)
  const avatarGroup = el('div', 'dio-hidden')
  avatarGroup.append(bodySec.root)
  const sceneGroup = el('div')
  const tlSec = section('Timeline', true)
  if (opts.timeline) tlSec.body.append(timelineControls(opts.timeline))
  sceneGroup.append(redrapeRow, heatmapRow, stressRow, pressureRow, wrinkleRow, opts.sim ? simSec.root : el('div'), env.root, animSec.root, opts.timeline ? tlSec.root : el('div'), view.root)

  const ctxTabs = el('div', 'dio-ctx-tabs')
  const ctxBtns: Record<'garment' | 'avatar', HTMLButtonElement> = {
    garment: el('button', 'dio-ctx-tab on'),
    avatar: el('button', 'dio-ctx-tab')
  }
  ctxBtns.garment.textContent = 'Garment'
  ctxBtns.avatar.textContent = 'Avatar'
  function setContext(c: 'garment' | 'avatar'): void {
    garmentGroup.classList.toggle('dio-hidden', c !== 'garment')
    avatarGroup.classList.toggle('dio-hidden', c !== 'avatar')
    ctxBtns.garment.classList.toggle('on', c === 'garment')
    ctxBtns.avatar.classList.toggle('on', c === 'avatar')
    opts.onSelectContext?.(c === 'garment' ? 'Garment' : 'Avatar / mannequin')
  }
  ctxBtns.garment.addEventListener('click', () => setContext('garment'))
  ctxBtns.avatar.addEventListener('click', () => setContext('avatar'))
  ctxTabs.append(ctxBtns.garment, ctxBtns.avatar)

  panel.append(ctxTabs, garmentGroup, avatarGroup, sceneGroup)

  // Reload every control from the current state (after switching the active layer).
  function refreshAll(): void {
    syncGarment()
    refreshers.forEach((r) => r.refresh())
    figBtns.female.classList.toggle('primary', opts.bodySize.bodyType === 'female')
    figBtns.male.classList.toggle('primary', opts.bodySize.bodyType === 'male')
    renderMetrics()
  }
  return {
    panel,
    api: { selectGarment, selectFabric, setFigure, syncGarment, refresh: refreshAll, refreshMetrics: renderMetrics, setContext }
  }
}
