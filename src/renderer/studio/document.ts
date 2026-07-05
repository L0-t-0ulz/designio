/**
 * The studio **document** — a fully serialisable description of a design session:
 * the body, the scene settings, and an ordered list of garment **layers** worn on
 * one mannequin. This one structure powers everything multi-garment: layering,
 * duplicate / cut / copy / paste, undo / redo (doc snapshots), and save / reopen
 * of a `.dio` project. Pure + unit-tested; the runtime (main.ts) builds live
 * meshes/solvers from it and reads them back into it.
 */
import type { GarmentParams, GarmentType, SleeveStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { AnimationMode, BodyType } from '../avatar/Mannequin'
import type { DesignConfig } from '../start/design'
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
    sleeve: l.sleeve
  }
}

/** One garment worn on the body (its own construction + fabric + print). */
export interface GarmentLayerData {
  garmentType: GarmentType
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  /** Manufacturing size (grades the girth). */
  size: SizeLabel
  fabricId: string
  color: number
  /** Printed text on the garment ('' = none). Uploaded PNGs are runtime-only. */
  text: string
  imageScale: number
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
    size: 'M',
    fabricId: c.fabricId,
    color: c.color,
    text: c.text,
    imageScale: c.imageScale,
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
    size: 'M',
    fabricId: getGarment(garmentType).defaultFabric ?? 'cotton-poplin',
    color: 0xc85a54,
    text: '',
    imageScale: 0.4,
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
  return { ...l }
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
