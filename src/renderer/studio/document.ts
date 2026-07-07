/**
 * The studio **document** — a fully serialisable description of a design session:
 * the body, the scene settings, and an ordered list of garment **layers** worn on
 * one mannequin. This one structure powers everything multi-garment: layering,
 * duplicate / cut / copy / paste, undo / redo (doc snapshots), and save / reopen
 * of a `.dio` project. Pure + unit-tested; the runtime (main.ts) builds live
 * meshes/solvers from it and reads them back into it.
 */
import type { CollarStyle, GarmentParams, GarmentType, SleeveStyle, SleeveShape, PocketStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { AnimationMode, BodyType } from '../avatar/Mannequin'
import { printToSpec, type DesignConfig, type PrintSpec } from '../start/design'
import { getGarment } from '../garments/registry'

/** Manufacturing sizes. `M` is the drafted block; each step grades the girth. */
export type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export const SIZES: SizeLabel[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SIZE_STEP: Record<SizeLabel, number> = { XS: -2, S: -1, M: 0, L: 1, XL: 2, XXL: 3 }
/** Girth grade per size: one step ≈ +4 cm circumference (≈ +0.64 cm radius). */
export function sizeEase(size: SizeLabel): number {
  return SIZE_STEP[size] * 0.0064
}
/** A layer's construction params with its size grade folded into the ease (girth). */
export function gradeParams(l: GarmentLayerData): GarmentParams {
  return {
    length: l.length,
    ease: Math.max(0, l.ease + sizeEase(l.size)),
    flare: l.flare,
    neckline: l.neckline,
    sleeve: l.sleeve,
    sleeveShape: l.sleeveShape,
    collar: l.collar,
    collarStyle: l.collarStyle,
    cuff: l.cuff,
    pleats: l.pleats,
    dart: l.dart,
    pocket: l.pocket,
    pocketStyle: l.pocketStyle,
    hem: l.hem,
    closure: l.closure,
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
 * `back` (body) and `legBack` (legs) scope just that piece's back panel — the
 * front panel uses the piece's own fabric (body default / `legs`). Body front
 * uses the layer's `fabricId`/`color`.
 */
export interface PartFabrics {
  sleeves?: PartFabric
  legs?: PartFabric
  back?: PartFabric
  legBack?: PartFabric
}

/** One garment worn on the body (its own construction + fabric + print). */
export interface GarmentLayerData {
  garmentType: GarmentType
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  sleeveShape?: SleeveShape
  /** Manufacturing size (grades the girth). */
  size: SizeLabel
  // construction detail (optional)
  collar?: boolean
  collarStyle?: CollarStyle
  cuff?: boolean
  pleats?: boolean
  dart?: boolean
  pocket?: boolean
  pocketStyle?: PocketStyle
  hem?: boolean
  /** Front closure — a centre-front placket with buttons (or a zip). */
  closure?: boolean
  /** Seam allowance (mm) + notches — pattern/production. */
  seam?: number
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
  visible: boolean
}

export interface BodyData {
  bodyType: BodyType
  height: number
  build: number
  bust: number
  waist: number
  hips: number
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
    flare: c.flare,
    neckline: c.neckline,
    sleeve: c.sleeve,
    sleeveShape: c.sleeveShape,
    size: c.size,
    collar: c.collar,
    collarStyle: c.collarStyle,
    cuff: c.cuff,
    pleats: c.pleats,
    dart: c.dart,
    pocket: c.pocket,
    pocketStyle: c.pocketStyle,
    hem: c.hem,
    closure: c.closure,
    seam: c.seam,
    notches: c.notches,
    trim: c.trim,
    trimColor: c.trimColor,
    trimFabricId: c.trimFabricId,
    partFabrics: c.partFabrics ? { ...c.partFabrics } : undefined,
    fabricId: c.fabricId,
    color: c.color,
    prints: c.prints.map(printToSpec),
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
    size: 'M',
    collar: d.collar,
    collarStyle: d.collarStyle,
    cuff: d.cuff,
    pleats: d.pleats,
    dart: d.dart,
    pocket: d.pocket,
    pocketStyle: d.pocketStyle,
    hem: d.hem,
    closure: d.closure,
    fabricId: getGarment(garmentType).defaultFabric ?? 'cotton-poplin',
    color: 0xc85a54,
    prints: [],
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
      hips: c.bodyHips
    },
    scene,
    layers: [layerFromConfig(c)],
    activeIndex: 0
  }
}

export function cloneLayer(l: GarmentLayerData): GarmentLayerData {
  return {
    ...l,
    partFabrics: l.partFabrics
      ? {
          sleeves: l.partFabrics.sleeves && { ...l.partFabrics.sleeves },
          legs: l.partFabrics.legs && { ...l.partFabrics.legs },
          back: l.partFabrics.back && { ...l.partFabrics.back },
          legBack: l.partFabrics.legBack && { ...l.partFabrics.legBack }
        }
      : undefined,
    prints: l.prints ? l.prints.map((p) => ({ ...p })) : undefined
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
    hips: +(b.hips ?? 1)
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
