import * as THREE from 'three'
import type { CollarStyle, GarmentType, SleeveStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { BodyType } from '../avatar/Mannequin'
import type { SkinTone, Undertone } from '../avatar/skin'
import type { SizeLabel, PartFabrics } from '../studio/document'
import { paintTextile, type TextilePattern } from '../fabric/textile'
import { paintColourwork, type ColourworkChart } from '../fabric/colourwork'
import { paintOmbre, type OmbreDirection } from '../fabric/ombre'
import { paintTartan, type TartanKind } from '../fabric/tartan'
import { paintWear, type WearKind } from '../fabric/wear'
import type { SparkleKind } from '../fabric/sparkle'
import type { IridescentKind } from '../fabric/iridescent'
import type { QuiltPattern } from '../fabric/quilt'
import type { LacePattern } from '../fabric/lace'
import type { FurKind } from '../fabric/fur'

/** Everything the start page lets you build before entering the 3D studio. */
export interface DesignConfig {
  garmentType: GarmentType
  fabricId: string
  color: number
  length: number
  ease: number
  easeChest?: number
  easeWaist?: number
  easeHip?: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  sleeveShape?: SleeveShape
  faceStyle?: import('../garments/schema').BalaclavaFace
  breath?: boolean
  distressed?: boolean
  convertibleWorn?: import('../garments/schema').ConvertibleWorn
  balaclavaWorn?: import('../garments/schema').BalaclavaWorn
  cuffHeight?: number
  slouch?: number
  scarfWidth?: number
  scarfPin?: boolean
  pinAt?: number
  scarfKnot?: boolean
  scarfDouble?: boolean
  scarfBlanket?: boolean
  gaiterWorn?: import('../garments/schema').GaiterWorn
  snoodWorn?: import('../garments/schema').SnoodWorn
  pomScale?: number
  pomColor?: number
  pomFur?: boolean
  cuffPatch?: 'leather' | 'woven'
  /** Manufacturing size (grades the garment girth). */
  size: SizeLabel
  /** Construction detail (optional). */
  collar?: boolean
  collarStyle?: CollarStyle
  cuff?: boolean
  pleats?: boolean
  pleatStyle?: PleatStyle
  crease?: boolean
  trouserBreak?: boolean
  fringe?: boolean
  piping?: boolean
  /** Seam & topstitch spec (type · needle · SPI · thread weight). */
  stitch?: import('../garment/stitchTypes').StitchSpec
  /** Physical fabric override in real units. */
  physicalFabric?: import('../fabric/physicalProps').PhysicalFabric
  dart?: boolean
  pocket?: boolean
  pocketStyle?: PocketStyle
  hem?: boolean
  hemShape?: import('../cloth/Garment').HemShape
  closure?: boolean
  /** Wear the closure open (unbuttoned/unzipped) — the garment gaps at centre-front. */
  closureOpen?: boolean
  lined?: boolean
  interfaced?: boolean
  /** Waterlogged rain/swim look — physics (heavier + limp + clings) + a wet glossy sheen. */
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
  /** Complexion — skin tone + undertone (undefined = the default warm mid skin). */
  skinTone?: SkinTone
  undertone?: Undertone
  /** Placed prints (logos + text), each positioned / sized / rotated. */
  prints: Print[]
  /** A repeating textile pattern tiled across the whole garment (behind prints). */
  textile?: TextilePattern
  /** A real tartan sett (thread-count stripes, 2/2 twill) woven across the garment. */
  tartan?: TartanKind
  /** A dip-dye / ombré gradient baked into the albedo (base → a deeper dipped tone). */
  ombre?: OmbreDirection
  /** A distressed / washed / faded wear finish bleached into the albedo. */
  wear?: WearKind
  /** Sparkle finish — sequins / beading / metallic foil (eveningwear glints). */
  sparkle?: SparkleKind
  /** Iridescent finish — soap-bubble / holographic / oil-slick colour shift. */
  iridescent?: IridescentKind
  /** Quilting finish — channel / diamond / box loft (puffers & jackets). */
  quilt?: QuiltPattern
  /** Lace / broderie — a sheer alpha-cutout finish (chantilly / geometric / fishnet). */
  lace?: LacePattern
  /** Faux fur / shearling / fleece pile finish. */
  fur?: FurKind
}

/** Which garment piece a print sits on — its `x/y` are across that piece's panel. */
export type PrintPart = 'body' | 'sleeves' | 'legs'

/** How a placed motif is finished: a flat graphic, raised **embroidery** (stitched
 * thread relief), or an **appliqué** patch (a raised panel with a stitched border).
 * The raised styles paint a bump map so they catch the light. */
export type PrintStyle = 'flat' | 'embroidery' | 'applique'

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
  /** The garment part this print is placed on (body / sleeves / legs). */
  part: PrintPart
  /** Finish: flat graphic · raised embroidery · appliqué patch. */
  style: PrintStyle
}

/** The serialisable part of a print (no runtime image) for `.dio` projects. */
export type PrintSpec = Omit<Print, 'image'>

let pid = 0
export const newPrintId = (): string => `pr${++pid}_${Math.random().toString(36).slice(2, 6)}`
// Default placement: centred on the front-facing chest (x≈0.25 is the +z face).
export function newImagePrint(image: HTMLImageElement, name: string): Print {
  return { id: newPrintId(), kind: 'image', image, imageName: name, text: '', color: 0xffffff, x: 0.25, y: 0.32, scale: 0.4, rotation: 0, part: 'body', style: 'flat' }
}
export function newTextPrint(text = ''): Print {
  return { id: newPrintId(), kind: 'text', image: null, text, color: 0x1a1a22, x: 0.25, y: 0.5, scale: 0.5, rotation: 0, part: 'body', style: 'flat' }
}
/** Whether a motif is raised (embroidery / appliqué) → contributes to the bump relief. */
export const printIsRaised = (p: Print): boolean => p.style === 'embroidery' || p.style === 'applique'
export const printHasContent = (p: Print): boolean => (p.kind === 'image' ? p.image != null : p.text.trim().length > 0)
export function printToSpec(p: Print): PrintSpec {
  const { image: _drop, ...spec } = p
  return spec
}
export const printFromSpec = (s: PrintSpec): Print => ({ ...s, image: null, part: s.part ?? 'body', style: s.style ?? 'flat' })

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
  /** Height relief for raised motifs (embroidery / appliqué) — `null` when none are
   * placed, so a flat design pays no bump cost. Updated by `redraw`. */
  bump: THREE.CanvasTexture | null
  /** Repaint with the *current* colour + prints (pass fresh input so a recolour isn't stale). */
  redraw: (input: DesignArtInput) => void
}

/** The minimal input the albedo canvas needs — a base colour + placed prints + an
 * optional repeating textile pattern behind them. */
export interface DesignArtInput {
  color: number
  prints: Print[]
  textile?: TextilePattern
  tartan?: TartanKind
  /** Knit colourwork — a tiling fair-isle jacquard or a placed intarsia block. */
  colourwork?: ColourworkChart
  ombre?: OmbreDirection
  wear?: WearKind
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/** Whether the design needs an albedo map — a print, a textile, a tartan, an ombré, or a wear finish. */
export function hasArt(c: { prints: Print[]; textile?: TextilePattern; tartan?: TartanKind; colourwork?: ColourworkChart; ombre?: OmbreDirection; wear?: WearKind }): boolean {
  return !!c.textile || !!c.tartan || !!c.colourwork || !!c.ombre || !!c.wear || c.prints.some(printHasContent)
}

/** Whether any placed motif is raised (embroidery / appliqué) → needs the bump map. */
export function anyRaised(prints: Print[]): boolean {
  return prints.some((p) => printHasContent(p) && printIsRaised(p))
}

/** The appliqué patch footprint (mm) for a motif, shared by the albedo + bump so
 *  the coloured patch and its relief line up. */
function appliqueBox(p: Print, size: number): { w: number; h: number; r: number } {
  const s = p.scale * size
  const w = p.kind === 'text' ? Math.max(s * 0.9, s * Math.min(p.text.trim().length, 10) * 0.26) : s
  const h = p.kind === 'text' ? s * 0.66 : p.image ? s * (p.image.height / p.image.width) : s
  return { w, h, r: Math.min(w, h) * 0.16 }
}

/** A darker/lighter tone of a colour for the appliqué border + motif-on-patch. */
function shade(color: number, dl: number): string {
  const c = new THREE.Color(color)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return '#' + new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + dl))).getHexString()
}

/** Draw the coloured motif onto the albedo — a flat/embroidered graphic in its own
 *  colour, or an appliqué patch (filled panel + border) with the motif proud on top. */
function paintAlbedoMotif(ctx: CanvasRenderingContext2D, p: Print, size: number): void {
  if (p.style === 'applique') {
    const { w, h, r } = appliqueBox(p, size)
    ctx.fillStyle = hex(p.color) // the patch fabric
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, r)
    ctx.fill()
    ctx.strokeStyle = shade(p.color, -0.22) // stitched-down edge
    ctx.lineWidth = Math.max(2, p.scale * size * 0.02)
    ctx.stroke()
    drawMotifShape(ctx, p, size, shade(p.color, p.kind === 'text' ? 0.4 : 0)) // motif on the patch
    return
  }
  drawMotifShape(ctx, p, size, hex(p.color)) // flat / embroidery graphic
}

/** Draw a motif's silhouette (text glyphs / image) in one bump tone, centred at the
 *  current transform origin (used to build the height relief). */
function drawMotifShape(b: CanvasRenderingContext2D, p: Print, size: number, fill: string): void {
  b.fillStyle = fill
  if (p.kind === 'text') {
    b.font = `800 ${Math.round(size * 0.12 * p.scale)}px system-ui, sans-serif`
    b.textAlign = 'center'
    b.textBaseline = 'middle'
    b.fillText(p.text.slice(0, 24), 0, 0)
  } else if (p.image) {
    const w = p.scale * size
    const h = w * (p.image.height / p.image.width)
    b.drawImage(p.image, -w / 2, -h / 2, w, h) // image luminance → relief
  }
}

/** Paint one raised motif into the bump height field (already translated/rotated to
 *  its place). Embroidery = the motif proud of the cloth; appliqué = a raised patch
 *  plateau with a satin-stitch tackdown border, the motif proud on top. */
function paintRaisedBump(b: CanvasRenderingContext2D, p: Print, size: number): void {
  const s = p.scale * size
  if (p.style === 'applique') {
    const { w, h, r } = appliqueBox(p, size)
    // raised patch plateau
    b.fillStyle = '#9a9a9a'
    b.beginPath()
    b.roundRect(-w / 2, -h / 2, w, h, r)
    b.fill()
    // satin-stitch tackdown just inside the edge (the highest ridge)
    b.strokeStyle = '#f0f0f0'
    b.lineWidth = Math.max(2, s * 0.035)
    b.setLineDash([Math.max(3, s * 0.05), Math.max(2, s * 0.035)])
    b.beginPath()
    b.roundRect(-w / 2 + s * 0.06, -h / 2 + s * 0.06, w - s * 0.12, h - s * 0.12, r * 0.7)
    b.stroke()
    b.setLineDash([])
    drawMotifShape(b, p, size, '#ffffff') // the motif sits proud on the patch
  } else {
    // embroidery: raised threads (the motif proud of the cloth, edges catch the light)
    drawMotifShape(b, p, size, '#e6e6e6')
  }
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
  // A grayscale height field (black = flat) for raised motifs — allocated lazily.
  let bumpCanvas: HTMLCanvasElement | null = null
  let bctx: CanvasRenderingContext2D | null = null
  const art: DesignArt = { texture: null as unknown as THREE.CanvasTexture, bump: null, redraw: () => {} }

  const placeMotif = (c: CanvasRenderingContext2D, p: Print, draw: () => void): void => {
    c.save()
    c.translate(p.x * size, p.y * size)
    c.rotate((p.rotation * Math.PI) / 180)
    c.scale(-1, 1) // the garment face samples the canvas mirrored — un-flip (front + back alike)
    draw()
    c.restore()
  }

  art.redraw = (inp: DesignArtInput): void => {
    ctx.fillStyle = hex(inp.color)
    ctx.fillRect(0, 0, size, size)
    if (inp.ombre) paintOmbre(ctx, size, inp.color, inp.ombre) // dip-dye gradient over the flat base
    if (inp.wear) paintWear(ctx, size, inp.color, inp.wear) // distressed / washed / faded bleach
    if (inp.textile) paintTextile(ctx, size, inp.textile, inp.color) // tiling pattern behind the prints
    if (inp.tartan) paintTartan(ctx, size, inp.tartan) // a real tartan sett (its own palette) behind the prints
    if (inp.colourwork) paintColourwork(ctx, size, inp.colourwork) // knit colourwork over the ground, behind the prints
    for (const p of inp.prints) {
      if (!printHasContent(p)) continue
      placeMotif(ctx, p, () => paintAlbedoMotif(ctx, p, size))
    }
    // Raised relief: paint embroidery/appliqué motifs into the bump height field.
    // The texture, once created, is kept (blanked when empty) so it disposes cleanly;
    // the material binds it only when `anyRaised` is true (see GarmentStack).
    const raised = inp.prints.filter((p) => printHasContent(p) && printIsRaised(p))
    if (raised.length || art.bump) {
      if (!bumpCanvas) {
        bumpCanvas = document.createElement('canvas')
        bumpCanvas.width = bumpCanvas.height = size
        bctx = bumpCanvas.getContext('2d')
      }
      const b = bctx!
      b.fillStyle = '#000'
      b.fillRect(0, 0, size, size)
      for (const p of raised) placeMotif(b, p, () => paintRaisedBump(b, p, size))
      if (!art.bump) {
        art.bump = new THREE.CanvasTexture(bumpCanvas)
        art.bump.colorSpace = THREE.NoColorSpace
        art.bump.anisotropy = 4
      }
      art.bump.needsUpdate = true
    }
    if (art.texture) art.texture.needsUpdate = true
  }
  art.redraw(input) // paint the canvas *before* creating the texture, so its first GPU upload isn't blank
  art.texture = new THREE.CanvasTexture(canvas)
  art.texture.colorSpace = THREE.SRGBColorSpace
  art.texture.anisotropy = 4
  return art
}
