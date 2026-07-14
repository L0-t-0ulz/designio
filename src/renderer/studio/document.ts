/**
 * The studio **document** — a fully serialisable description of a design session:
 * the body, the scene settings, and an ordered list of garment **layers** worn on
 * one mannequin. This one structure powers everything multi-garment: layering,
 * duplicate / cut / copy / paste, undo / redo (doc snapshots), and save / reopen
 * of a `.dio` project. Pure + unit-tested; the runtime (main.ts) builds live
 * meshes/solvers from it and reads them back into it.
 */
import type { CollarStyle, GarmentParams, GarmentType, SleeveStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { AnimationMode, BodyType } from '../avatar/Mannequin'
import { SKIN_TONES, UNDERTONES, type SkinTone, type Undertone } from '../avatar/skin'
import { printToSpec, type DesignConfig, type PrintSpec } from '../start/design'
import type { TextilePattern } from '../fabric/textile'
import type { OmbreDirection } from '../fabric/ombre'
import type { WearKind } from '../fabric/wear'
import type { SparkleKind } from '../fabric/sparkle'
import type { IridescentKind } from '../fabric/iridescent'
import type { QuiltPattern } from '../fabric/quilt'
import type { LacePattern } from '../fabric/lace'
import type { FurKind } from '../fabric/fur'
import { cloneDraft, type WeaveDraft } from '../fabric/weaveDraft'
import { cloneChart, type KnitChart } from '../fabric/knitChart'
import { cloneColourwork, type ColourworkChart } from '../fabric/colourwork'
import type { YarnSpec } from '../fabric/yarn'
import { getGarment } from '../garments/registry'

/** Manufacturing sizes. `M` is the drafted block; each step grades the girth. */
export type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export const SIZES: SizeLabel[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SIZE_STEP: Record<SizeLabel, number> = { XS: -2, S: -1, M: 0, L: 1, XL: 2, XXL: 3 }
/**
 * **Grade rules** — the per-size-step increments (cm) a real pattern grades by.
 * The default matches the app's historical uniform girth grade (+4 cm circumference
 * per step, no length/sleeve grade); a grade-rule editor lets a designer set their
 * own increments per point, like a production grading table.
 */
export interface GradeRules {
  /** Circumference grade per size step (cm) — chest/waist/hip girth. */
  girthCm: number
  /** Garment-length grade per size step (cm) — hem drops as sizes go up. */
  lengthCm: number
  /** Sleeve-length grade per size step (cm). */
  sleeveCm: number
}
export const DEFAULT_GRADE_RULES: GradeRules = { girthCm: 4, lengthCm: 0, sleeveCm: 0 }
/** The signed size step from the drafted block (M = 0). */
export function sizeStep(size: SizeLabel): number {
  return SIZE_STEP[size]
}
/** Girth rule → radius ease per step (m). 0.0016 = the app's historical cm-circumference
 *  → m-radius factor (4 cm ≈ 0.64 cm radius), kept exact for back-compat. */
export function gradeEase(size: SizeLabel, rules: GradeRules = DEFAULT_GRADE_RULES): number {
  return SIZE_STEP[size] * rules.girthCm * 0.0016
}
/** Girth grade per size at the default rules: one step ≈ +4 cm circumference (≈ +0.64 cm radius). */
export function sizeEase(size: SizeLabel): number {
  return gradeEase(size)
}
/** A layer's construction params with its size grade folded in — girth into the ease,
 *  length/sleeve rules as metre offsets the factory applies to the drafted geometry. */
export function gradeParams(l: GarmentLayerData): GarmentParams {
  const rules = l.gradeRules ?? DEFAULT_GRADE_RULES
  const step = SIZE_STEP[l.size]
  return {
    length: l.length,
    // floor at −3 cm: **compression fit** — a garment drafted smaller than the body
    // (activewear) stretches over it; the solver pushes it out, strain/pressure show it.
    ease: Math.max(-0.03, l.ease + gradeEase(l.size, rules)),
    easeChest: l.easeChest,
    easeWaist: l.easeWaist,
    easeHip: l.easeHip,
    lengthGradeM: (step * rules.lengthCm) / 100 || 0, // `|| 0` normalises −0 (negative step × zero rule)
    sleeveGradeM: (step * rules.sleeveCm) / 100 || 0,
    flare: l.flare,
    neckline: l.neckline,
    sleeve: l.sleeve,
    sleeveShape: l.sleeveShape,
    faceStyle: l.faceStyle,
    breath: l.breath,
    balaclavaWorn: l.balaclavaWorn,
    cuffHeight: l.cuffHeight,
    slouch: l.slouch,
    scarfWidth: l.scarfWidth,
    gaiterWorn: l.gaiterWorn,
    collar: l.collar,
    collarStyle: l.collarStyle,
    cuff: l.cuff,
    pleats: l.pleats,
    pleatStyle: l.pleatStyle,
    crease: l.crease,
    trouserBreak: l.trouserBreak,
    fringe: l.fringe,
    piping: l.piping,
    stitch: l.stitch,
    dart: l.dart,
    pocket: l.pocket,
    pocketStyle: l.pocketStyle,
    hem: l.hem,
    hemShape: l.hemShape,
    closure: l.closure,
    closureOpen: l.closureOpen,
    lined: l.lined,
    interfaced: l.interfaced,
    wet: l.wet,
    puff: l.puff,
    waistband: l.waistband,
    facing: l.facing,
    drawstring: l.drawstring,
    ruffles: l.ruffles,
    boning: l.boning,
    ribbing: l.ribbing,
    yoke: l.yoke,
    princess: l.princess,
    frillStyle: l.frillStyle,
    seam: l.seam,
    notches: l.notches
  }
}
// (gradeParams above carries seam/notches so the flat pattern reflects them.)

/** A fabric assignment for one garment part. */
export interface PartFabric {
  fabricId: string
  color: number
}

/**
 * Per-part / per-panel fabric overrides. `sleeves`/`legs` scope a whole piece;
 * `back` (body), `legBack` (legs) and `sleeveBack` (sleeves) scope just that
 * piece's back panel — the front panel uses the piece's own fabric (body
 * default / `legs` / `sleeves`). Body front uses the layer's `fabricId`/`color`.
 */
export interface PartFabrics {
  sleeves?: PartFabric
  legs?: PartFabric
  back?: PartFabric
  legBack?: PartFabric
  sleeveBack?: PartFabric
}

/** One garment worn on the body (its own construction + fabric + print). */
export interface GarmentLayerData {
  garmentType: GarmentType
  length: number
  ease: number
  /** Per-zone ease offsets (m) on top of `ease`. */
  easeChest?: number
  easeWaist?: number
  easeHip?: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  sleeveShape?: SleeveShape
  /** Balaclava face opening (ski mask) — full · eyes · three-hole · open-face. */
  faceStyle?: import('../garments/schema').BalaclavaFace
  /** Breathing preview — a cyclic exhale puffing the mask's mouth opening. */
  breath?: boolean
  /** Balaclava worn state — down over the face or rolled up into a beanie. */
  balaclavaWorn?: import('../garments/schema').BalaclavaWorn
  /** Beanie fit — cuff height + slouch depth (0…1 each). */
  cuffHeight?: number
  slouch?: number
  /** Scarf width multiplier (0.5…1.8). */
  scarfWidth?: number
  /** Gaiter worn state — bunched at the neck or pulled over the nose. */
  gaiterWorn?: import('../garments/schema').GaiterWorn
  /** Pom customizer (pom-pom beanie) — size scale · contrast colour · faux-fur pile. */
  pomScale?: number
  pomColor?: number
  pomFur?: boolean
  /** A brand patch on the beanie band — leather patch or woven label. */
  cuffPatch?: 'leather' | 'woven'
  /** Manufacturing size (grades the girth). */
  size: SizeLabel
  /** Custom per-point grade increments (cm / size step); default = uniform girth grade. */
  gradeRules?: GradeRules
  // construction detail (optional)
  collar?: boolean
  collarStyle?: CollarStyle
  cuff?: boolean
  pleats?: boolean
  pleatStyle?: PleatStyle
  /** Pressed trouser crease + break (tailored trousers). */
  crease?: boolean
  trouserBreak?: boolean
  /** Fringe trim — hanging strands along the bottom hem. */
  fringe?: boolean
  /** Piping — a corded contrast edge along the neckline + hem. */
  piping?: boolean
  dart?: boolean
  pocket?: boolean
  pocketStyle?: PocketStyle
  hem?: boolean
  /** Curved hem shape (high-low · shirttail · handkerchief). */
  hemShape?: import('../cloth/Garment').HemShape
  /** Front closure — a centre-front placket with buttons (or a zip). */
  closure?: boolean
  /** Closure decor design — button count/size/colour, zip tape + pull colours. */
  closureDesign?: import('./closureDesign').ClosureDesign
  /** Wear the closure open (unbuttoned/unzipped) — the garment gaps at centre-front. */
  closureOpen?: boolean
  lined?: boolean
  interfaced?: boolean
  /** Waterlogged rain/swim look — heavier + limp physics + a wet glossy sheen. */
  wet?: boolean
  /** Trapped-air loft — inflate the garment off the body (a puffer), even without quilting. */
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
  /** Smoothing underlayer — simulated (outer garments drape over it) but never rendered. */
  underlayer?: boolean
  /** Pinned pattern notes (mm, pattern-layout space) — rendered in the 2D pane + exported. */
  patternNotes?: { x: number; y: number; text: string }[]
  /** Pilling & fuzz aging (0…1) — bobbled, matte aged-knit surface. */
  pilling?: number
  /** Eco-material flags — recycled-content or deadstock fabric (sustainability pack). */
  recycledFabric?: boolean
  deadstockFabric?: boolean
  /** Seam allowance (mm) + notches — pattern/production. */
  seam?: number
  /** Seam & topstitch spec (type · needle · SPI · thread weight) — 3D + tech pack. */
  stitch?: import('../garment/stitchTypes').StitchSpec
  /** Physical fabric override — the real-units editor (GSM · mm · bend µN·m · stretch % · shear %). */
  physicalFabric?: import('../fabric/physicalProps').PhysicalFabric
  notches?: boolean
  /** Contrast trim (collar/cuffs/pockets/hem) — its own fabric + colour. */
  trim?: boolean
  trimColor?: number
  trimFabricId?: string
  /** Per-part / per-panel fabric overrides (Body front uses the default fabricId/color below). */
  partFabrics?: PartFabrics
  fabricId: string
  color: number
  /** Placed prints (logos + text); uploaded PNGs are runtime-only (image dropped on save). */
  prints?: PrintSpec[]
  textile?: TextilePattern
  ombre?: OmbreDirection
  wear?: WearKind
  /** Sparkle finish — sequins / beading / metallic foil (eveningwear glints). */
  sparkle?: SparkleKind
  iridescent?: IridescentKind
  /** Quilting finish — channel / diamond / box loft (puffers & jackets). */
  quilt?: QuiltPattern
  lace?: LacePattern
  fur?: FurKind
  /** Custom weave draft (threading · tie-up · treadling) — replaces the fabric's preset weave maps. */
  weaveDraft?: WeaveDraft
  /** Custom knit stitch chart (knit/purl/cable cells) — replaces the fabric's preset weave maps. */
  knitChart?: KnitChart
  /** Knit colourwork — a tiling fair-isle jacquard or a placed intarsia block (albedo layer). */
  colourwork?: ColourworkChart
  /** The yarn the fabric is spun from (count · ply · twist) — adjusts the fabric's hand. */
  yarn?: YarnSpec
  /** Saved colour/fabric variants of this design (compared in the swatch grid). */
  colorways?: Colorway[]
  visible: boolean
}

/** A named colour/fabric variant of one design — the appearance-only fields
 *  (colour · fabric · per-part fabric · trim · textile/sparkle/quilt finishes).
 *  Applying a colorway never changes the garment's shape/construction. */
export interface Colorway {
  id: string
  name: string
  color: number
  fabricId: string
  trim?: boolean
  trimColor?: number
  trimFabricId?: string
  partFabrics?: PartFabrics
  textile?: TextilePattern
  ombre?: OmbreDirection
  wear?: WearKind
  sparkle?: SparkleKind
  iridescent?: IridescentKind
  quilt?: QuiltPattern
  lace?: LacePattern
  fur?: FurKind
  weaveDraft?: WeaveDraft
  knitChart?: KnitChart
  colourwork?: ColourworkChart
  yarn?: YarnSpec
}

let cwSeq = 0
export const newColorwayId = (): string => `cw${++cwSeq}_${Math.random().toString(36).slice(2, 6)}`

const clonePartFabrics = (pf?: PartFabrics): PartFabrics | undefined =>
  pf
    ? {
        sleeves: pf.sleeves && { ...pf.sleeves },
        legs: pf.legs && { ...pf.legs },
        back: pf.back && { ...pf.back },
        legBack: pf.legBack && { ...pf.legBack },
        sleeveBack: pf.sleeveBack && { ...pf.sleeveBack }
      }
    : undefined

/** Snapshot a layer's current appearance as a colorway (shape fields excluded). */
export function captureColorway(l: GarmentLayerData, name: string): Colorway {
  return {
    id: newColorwayId(),
    name,
    color: l.color,
    fabricId: l.fabricId,
    trim: l.trim,
    trimColor: l.trimColor,
    trimFabricId: l.trimFabricId,
    partFabrics: clonePartFabrics(l.partFabrics),
    textile: l.textile,
    ombre: l.ombre,
    wear: l.wear,
    sparkle: l.sparkle,
    iridescent: l.iridescent,
    quilt: l.quilt,
    lace: l.lace,
    fur: l.fur,
    weaveDraft: l.weaveDraft && cloneDraft(l.weaveDraft),
    knitChart: l.knitChart && cloneChart(l.knitChart),
    colourwork: l.colourwork && cloneColourwork(l.colourwork),
    yarn: l.yarn && { ...l.yarn }
  }
}

/** Apply a colorway to a layer in place — appearance only; construction is untouched. */
export function applyColorway(l: GarmentLayerData, cw: Colorway): void {
  l.color = cw.color
  l.fabricId = cw.fabricId
  l.trim = cw.trim
  l.trimColor = cw.trimColor
  l.trimFabricId = cw.trimFabricId
  l.partFabrics = clonePartFabrics(cw.partFabrics)
  l.textile = cw.textile
  l.ombre = cw.ombre
  l.wear = cw.wear
  l.sparkle = cw.sparkle
  l.iridescent = cw.iridescent
  l.quilt = cw.quilt
  l.lace = cw.lace
  l.fur = cw.fur
  l.weaveDraft = cw.weaveDraft && cloneDraft(cw.weaveDraft)
  l.knitChart = cw.knitChart && cloneChart(cw.knitChart)
  l.colourwork = cw.colourwork && cloneColourwork(cw.colourwork)
  l.yarn = cw.yarn && { ...cw.yarn }
}

export interface BodyData {
  bodyType: BodyType
  height: number
  build: number
  bust: number
  waist: number
  hips: number
  /** Maternity — trimester 0…3 (absent = none). */
  belly?: number
  /** Complexion — skin tone + undertone (undefined = the default warm mid skin). */
  skinTone?: SkinTone
  undertone?: Undertone
}

export interface SceneData {
  gravity: number
  windX: number
  windZ: number
  animMode: AnimationMode
  animSpeed: number
}

export interface ProjectDoc {
  version: 1
  body: BodyData
  scene: SceneData
  layers: GarmentLayerData[]
  activeIndex: number
}

export const DOC_VERSION = 1 as const

export function defaultScene(): SceneData {
  return { gravity: 9.81, windX: 0, windZ: 0, animMode: 'static', animSpeed: 1 }
}

/** A garment layer straight from a start-page config. */
export function layerFromConfig(c: DesignConfig): GarmentLayerData {
  return {
    garmentType: c.garmentType,
    length: c.length,
    ease: c.ease,
    easeChest: c.easeChest,
    easeWaist: c.easeWaist,
    easeHip: c.easeHip,
    flare: c.flare,
    neckline: c.neckline,
    sleeve: c.sleeve,
    sleeveShape: c.sleeveShape,
    faceStyle: c.faceStyle,
    breath: c.breath,
    balaclavaWorn: c.balaclavaWorn,
    cuffHeight: c.cuffHeight,
    slouch: c.slouch,
    scarfWidth: c.scarfWidth,
    gaiterWorn: c.gaiterWorn,
    pomScale: c.pomScale,
    pomColor: c.pomColor,
    pomFur: c.pomFur,
    cuffPatch: c.cuffPatch,
    size: c.size,
    collar: c.collar,
    collarStyle: c.collarStyle,
    cuff: c.cuff,
    pleats: c.pleats,
    pleatStyle: c.pleatStyle,
    crease: c.crease,
    trouserBreak: c.trouserBreak,
    fringe: c.fringe,
    piping: c.piping,
    stitch: c.stitch,
    physicalFabric: c.physicalFabric,
    dart: c.dart,
    pocket: c.pocket,
    pocketStyle: c.pocketStyle,
    hem: c.hem,
    hemShape: c.hemShape,
    closure: c.closure,
    closureOpen: c.closureOpen,
    lined: c.lined,
    interfaced: c.interfaced,
    wet: c.wet,
    puff: c.puff,
    waistband: c.waistband,
    facing: c.facing,
    drawstring: c.drawstring,
    ruffles: c.ruffles,
    boning: c.boning,
    ribbing: c.ribbing,
    yoke: c.yoke,
    princess: c.princess,
    frillStyle: c.frillStyle,
    seam: c.seam,
    notches: c.notches,
    trim: c.trim,
    trimColor: c.trimColor,
    trimFabricId: c.trimFabricId,
    partFabrics: c.partFabrics ? { ...c.partFabrics } : undefined,
    fabricId: c.fabricId,
    color: c.color,
    prints: c.prints.map(printToSpec),
    textile: c.textile,
    ombre: c.ombre,
    wear: c.wear,
    sparkle: c.sparkle,
    iridescent: c.iridescent,
    quilt: c.quilt,
    lace: c.lace,
    fur: c.fur,
    visible: true
  }
}

/** A fresh layer for a given garment id, using that garment's default fit/style. */
export function defaultLayer(garmentType: GarmentType = 'top'): GarmentLayerData {
  const d = getGarment(garmentType).defaults
  return {
    garmentType,
    length: d.length ?? 0.6,
    ease: d.ease ?? 0.02,
    flare: d.flare ?? 0.05,
    neckline: d.neckline ?? 'scoop',
    sleeve: d.sleeve ?? 'short',
    sleeveShape: d.sleeveShape,
    faceStyle: d.faceStyle,
    balaclavaWorn: d.balaclavaWorn,
    cuffHeight: d.cuffHeight,
    slouch: d.slouch,
    size: 'M',
    collar: d.collar,
    collarStyle: d.collarStyle,
    cuff: d.cuff,
    pleats: d.pleats,
    pleatStyle: d.pleatStyle,
    dart: d.dart,
    pocket: d.pocket,
    pocketStyle: d.pocketStyle,
    hem: d.hem,
    hemShape: d.hemShape,
    gaiterWorn: d.gaiterWorn,
    closure: d.closure,
    lined: d.lined,
    interfaced: d.interfaced,
    wet: d.wet,
    puff: d.puff,
    waistband: d.waistband,
    facing: d.facing,
    drawstring: d.drawstring,
    ruffles: d.ruffles,
    boning: d.boning,
    ribbing: d.ribbing,
    yoke: d.yoke,
    princess: d.princess,
    frillStyle: d.frillStyle,
    fabricId: getGarment(garmentType).defaultFabric ?? 'cotton-poplin',
    color: 0xc85a54,
    prints: [],
    textile: undefined,
    ombre: undefined,
    wear: undefined,
    sparkle: undefined,
    iridescent: undefined,
    quilt: undefined,
    lace: undefined,
    fur: undefined,
    visible: true
  }
}

/** The initial single-layer document for a start-page design. */
export function docFromConfig(c: DesignConfig, scene: SceneData = defaultScene()): ProjectDoc {
  return {
    version: DOC_VERSION,
    body: {
      bodyType: c.bodyType,
      height: c.bodyHeight,
      build: c.bodyBuild,
      bust: c.bodyBust,
      waist: c.bodyWaist,
      hips: c.bodyHips,
      skinTone: c.skinTone,
      undertone: c.undertone
    },
    scene,
    layers: [layerFromConfig(c)],
    activeIndex: 0
  }
}

/** Whether a layer's meshes render: visible AND not a smoothing underlayer
 *  (underlayers keep visible=true so they simulate + collide, but never draw). */
export function layerShown(d: Pick<GarmentLayerData, 'visible' | 'underlayer'>): boolean {
  return !!d.visible && !d.underlayer
}

export function cloneLayer(l: GarmentLayerData): GarmentLayerData {
  return {
    ...l,
    gradeRules: l.gradeRules ? { ...l.gradeRules } : undefined, // own copy — never share nested state across layers
    closureDesign: l.closureDesign ? { ...l.closureDesign } : undefined,
    partFabrics: clonePartFabrics(l.partFabrics),
    prints: l.prints ? l.prints.map((p) => ({ ...p })) : undefined,
    textile: l.textile,
    ombre: l.ombre,
    wear: l.wear,
    sparkle: l.sparkle,
    iridescent: l.iridescent,
    quilt: l.quilt,
    lace: l.lace,
    fur: l.fur,
    weaveDraft: l.weaveDraft && cloneDraft(l.weaveDraft),
    knitChart: l.knitChart && cloneChart(l.knitChart),
    colourwork: l.colourwork && cloneColourwork(l.colourwork),
    yarn: l.yarn && { ...l.yarn },
    colorways: l.colorways
      ? l.colorways.map((cw) => ({
          ...cw,
          partFabrics: clonePartFabrics(cw.partFabrics),
          weaveDraft: cw.weaveDraft && cloneDraft(cw.weaveDraft),
          knitChart: cw.knitChart && cloneChart(cw.knitChart),
          colourwork: cw.colourwork && cloneColourwork(cw.colourwork),
          yarn: cw.yarn && { ...cw.yarn }
        }))
      : undefined
  }
}

export function serializeDoc(doc: ProjectDoc): string {
  return JSON.stringify(doc, null, 2)
}

const isBodyType = (v: unknown): v is BodyType => v === 'female' || v === 'male'
const clampIndex = (i: number, len: number): number => (len === 0 ? 0 : Math.max(0, Math.min(len - 1, i | 0)))

/**
 * Parse + validate a `.dio` project (or a doc snapshot). Throws on structurally
 * invalid input; coerces missing/soft fields to safe defaults so older files
 * still open. Returns a normalised {@link ProjectDoc}.
 */
export function parseDoc(text: string): ProjectDoc {
  const raw = JSON.parse(text) as Partial<ProjectDoc>
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.layers)) {
    throw new Error('Not a DesignIO project (no layers).')
  }
  const b = raw.body ?? ({} as Partial<BodyData>)
  const body: BodyData = {
    bodyType: isBodyType(b.bodyType) ? b.bodyType : 'female',
    height: +(b.height ?? 1),
    build: +(b.build ?? 1),
    bust: +(b.bust ?? 1),
    waist: +(b.waist ?? 1),
    hips: +(b.hips ?? 1),
    // conditional spread: no `belly: undefined` key, so a default doc's body still
    // reads as all-neutral (main only calls setBody when a scale differs from 1)
    ...(typeof b.belly === 'number' && b.belly > 0 ? { belly: +b.belly } : {}),
    skinTone: b.skinTone && (SKIN_TONES as string[]).includes(b.skinTone) ? b.skinTone : undefined,
    undertone: b.undertone && (UNDERTONES as string[]).includes(b.undertone) ? b.undertone : undefined
  }
  const s = raw.scene ?? ({} as Partial<SceneData>)
  const scene: SceneData = {
    gravity: +(s.gravity ?? 9.81),
    windX: +(s.windX ?? 0),
    windZ: +(s.windZ ?? 0),
    animMode: (s.animMode as AnimationMode) ?? 'static',
    animSpeed: +(s.animSpeed ?? 1)
  }
  const layers: GarmentLayerData[] = raw.layers.map((l) => {
    const base = defaultLayer((l?.garmentType as GarmentType) ?? 'top')
    return { ...base, ...l, visible: l?.visible ?? true }
  })
  if (layers.length === 0) layers.push(defaultLayer())
  return { version: DOC_VERSION, body, scene, layers, activeIndex: clampIndex(raw.activeIndex ?? 0, layers.length) }
}
