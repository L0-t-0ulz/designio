import * as THREE from 'three'
import type { GarmentType, SleeveStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { BodyType } from '../avatar/Mannequin'
import type { SizeLabel, PartFabrics } from '../studio/document'

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
  partFabrics?: PartFabrics
  /** Mannequin figure — female or male (slim model proportions). */
  bodyType: BodyType
  /** Mannequin size — height scales Y, build scales overall girth; bust/waist/hips shape it. */
  bodyHeight: number
  bodyBuild: number
  bodyBust: number
  bodyWaist: number
  bodyHips: number
  /** Placed prints (logos + text), each positioned / sized / rotated. */
  prints: Print[]
}

/** A logo/graphic or text placed on the garment. `x/y` are 0…1 across the front. */
export interface Print {
  id: string
  kind: 'image' | 'text'
  /** Uploaded image (runtime-only; not serialised). */
  image: HTMLImageElement | null
  imageName?: string
  text: string
  color: number
  x: number
  y: number
  /** Size as a fraction of the print canvas (image width / text size). */
  scale: number
  /** Rotation in degrees. */
  rotation: number
}

/** The serialisable part of a print (no runtime image) for `.dio` projects. */
export type PrintSpec = Omit<Print, 'image'>

let pid = 0
export const newPrintId = (): string => `pr${++pid}_${Math.random().toString(36).slice(2, 6)}`
// Default placement: centred on the front-facing chest (x≈0.25 is the +z face).
export function newImagePrint(image: HTMLImageElement, name: string): Print {
  return { id: newPrintId(), kind: 'image', image, imageName: name, text: '', color: 0xffffff, x: 0.25, y: 0.32, scale: 0.4, rotation: 0 }
}
export function newTextPrint(text = ''): Print {
  return { id: newPrintId(), kind: 'text', image: null, text, color: 0x1a1a22, x: 0.25, y: 0.5, scale: 0.5, rotation: 0 }
}
export const printHasContent = (p: Print): boolean => (p.kind === 'image' ? p.image != null : p.text.trim().length > 0)
export function printToSpec(p: Print): PrintSpec {
  const { image: _drop, ...spec } = p
  return spec
}
export const printFromSpec = (s: PrintSpec): Print => ({ ...s, image: null })

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
    prints: []
  }
}

export interface DesignArt {
  texture: THREE.CanvasTexture
  redraw: () => void
}

/** The minimal input the albedo canvas needs — a base colour + placed prints. */
export interface DesignArtInput {
  color: number
  prints: Print[]
  /** Front faces sample the canvas mirrored (default true un-flips them); the
   *  back face samples it the opposite way, so a back panel passes `false`. */
  mirror?: boolean
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/** Whether the design carries any user art (a print with content) vs a plain colour. */
export function hasArt(c: { prints: Print[] }): boolean {
  return c.prints.some(printHasContent)
}

/**
 * Paint the design onto a canvas → a CanvasTexture used as the garment's albedo
 * `map`. Base colour fills it; each **print** (logo or text) is drawn at its own
 * position · size · rotation, layered in order. The procedural weave normal map
 * still layers on top for fabric detail.
 */
export function buildDesignArt(input: DesignArtInput): DesignArt {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const redraw = (): void => {
    ctx.fillStyle = hex(input.color)
    ctx.fillRect(0, 0, size, size)
    for (const p of input.prints) {
      if (!printHasContent(p)) continue
      ctx.save()
      ctx.translate(p.x * size, p.y * size)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.scale(input.mirror === false ? 1 : -1, 1) // front samples mirrored (un-flip); back samples the opposite way
      if (p.kind === 'image' && p.image) {
        const w = p.scale * size
        const h = w * (p.image.height / p.image.width)
        ctx.drawImage(p.image, -w / 2, -h / 2, w, h)
      } else if (p.kind === 'text') {
        ctx.fillStyle = hex(p.color)
        ctx.font = `700 ${Math.round(size * 0.12 * p.scale)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.text.slice(0, 24), 0, 0)
      }
      ctx.restore()
    }
    texture.needsUpdate = true
  }
  redraw()
  return { texture, redraw }
}
