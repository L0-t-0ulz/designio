import * as THREE from 'three'
import type { GarmentType, SleeveStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { BodyType } from '../avatar/Mannequin'
import type { SizeLabel, PartFabric } from '../studio/document'

/** Everything the start page lets you build before entering the 3D studio. */
export interface DesignConfig {
  garmentType: GarmentType
  fabricId: string
  color: number
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  /** Manufacturing size (grades the garment girth). */
  size: SizeLabel
  /** Construction detail (optional). */
  collar?: boolean
  cuff?: boolean
  pleats?: boolean
  dart?: boolean
  pocket?: boolean
  hem?: boolean
  seam?: number
  notches?: boolean
  trim?: boolean
  trimColor?: number
  trimFabricId?: string
  partFabrics?: { sleeves?: PartFabric; legs?: PartFabric }
  /** Mannequin figure — female or male (slim model proportions). */
  bodyType: BodyType
  /** Mannequin size — height scales Y, build scales overall girth; bust/waist/hips shape it. */
  bodyHeight: number
  bodyBuild: number
  bodyBust: number
  bodyWaist: number
  bodyHips: number
  /** Your uploaded graphic/print (optional). */
  image: HTMLImageElement | null
  imageScale: number
  text: string
  textColor: number
}

export function defaultConfig(): DesignConfig {
  return {
    garmentType: 'dress',
    fabricId: 'cotton-poplin',
    color: 0xc85a54,
    length: 0.6,
    ease: 0.015,
    flare: 0.05,
    neckline: 'scoop',
    sleeve: 'short',
    size: 'M',
    bodyType: 'female',
    bodyHeight: 1,
    bodyBuild: 1,
    bodyBust: 1,
    bodyWaist: 1,
    bodyHips: 1,
    image: null,
    imageScale: 0.4,
    text: '',
    textColor: 0x1a1a22
  }
}

export interface DesignArt {
  texture: THREE.CanvasTexture
  redraw: () => void
}

/** The minimal fields the albedo canvas needs — a `DesignConfig` or a garment layer. */
export interface DesignArtInput {
  color: number
  image: HTMLImageElement | null
  imageScale: number
  text: string
  textColor: number
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/** Whether the design carries any user art (graphic or text) vs a plain colour. */
export function hasArt(c: { image: HTMLImageElement | null; text: string }): boolean {
  return c.image != null || c.text.trim().length > 0
}

/**
 * Paint the design onto a canvas → a CanvasTexture used as the garment's albedo
 * `map`. Base colour fills it; your graphic + text sit on the chest area. The
 * procedural weave normal map still layers on top for fabric detail.
 */
export function buildDesignArt(config: DesignArtInput): DesignArt {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const redraw = (): void => {
    ctx.fillStyle = hex(config.color)
    ctx.fillRect(0, 0, size, size)
    if (config.image) {
      const w = config.imageScale * size
      const h = w * (config.image.height / config.image.width)
      ctx.drawImage(config.image, (size - w) / 2, size * 0.28 - h / 2, w, h)
    }
    if (config.text.trim()) {
      ctx.fillStyle = hex(config.textColor)
      ctx.font = `700 ${Math.round(size * 0.06)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(config.text.slice(0, 24), size / 2, size * 0.52)
    }
    texture.needsUpdate = true
  }
  redraw()
  return { texture, redraw }
}
