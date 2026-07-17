import * as THREE from 'three'
import type { CollarStyle, GarmentType, SleeveStyle, SleeveShape, PocketStyle, PleatStyle, FrillStyle } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { BodyType } from '../avatar/Mannequin'
import type { SkinTone, Undertone } from '../avatar/skin'
import type { SizeLabel, PartFabrics } from '../studio/document'
import { paintTextile, type TextilePattern, type RepeatMode } from '../fabric/textile'
import { paintColourwork, type ColourworkChart } from '../fabric/colourwork'
import { paintOmbre, type OmbreDirection } from '../fabric/ombre'
import { paintTartan, type TartanKind } from '../fabric/tartan'
import { paintWear, type WearKind } from '../fabric/wear'
import { paintDuotone, type DuotoneKind } from '../fabric/duotone'
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
  scarfTuck?: boolean
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
  reflectiveTrim?: boolean
  thermo?: boolean
  thermoWarm?: number
  thermoTemp?: number
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
  /** Textile motif scale (0.25…4; >1 = bigger) + rotation in degrees. */
  textileScale?: number
  textileRotation?: number
  textileRepeat?: RepeatMode
  /** A real tartan sett (thread-count stripes, 2/2 twill) woven across the garment. */
  tartan?: TartanKind
  /** A dip-dye / ombré gradient baked into the albedo (base → a deeper dipped tone). */
  ombre?: OmbreDirection
  /** A distressed / washed / faded wear finish bleached into the albedo. */
  wear?: WearKind
  /** A duotone two-tone remap of the fabric/pattern (behind the prints). */
  duotone?: DuotoneKind
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
 * thread relief), an **appliqué** patch (a raised panel with a stitched border), a
 * **puff** print (a chunky rounded high-loft rubber print), a **discharge** print
 * (bleaches the fabric to a pale tone where it prints), or a **foil** print (a
 * bright metallic transfer). The raised styles (embroidery · appliqué · puff) paint
 * a bump map so they catch the light. */
export type PrintStyle = 'flat' | 'embroidery' | 'applique' | 'puff' | 'discharge' | 'foil' | 'enamel-pin' | 'woven'
export const PRINT_STYLES: PrintStyle[] = ['flat', 'embroidery', 'applique', 'puff', 'discharge', 'foil', 'enamel-pin', 'woven']

/** The bright metallic transfer tone for a foil print — the print's hue lifted toward
 *  a light metallic sheen. Pure so it's unit-tested. */
export function foilTone(color: number): number {
  const c = new THREE.Color(color)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  // keep the hue vivid (foil gold reads gold) but lift it bright + reflective
  return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 0.5 + 0.32), Math.max(0.62, hsl.l * 0.5 + 0.4)).getHex()
}

/** How a print blends onto the fabric beneath it — opaque, multiplied (tints into the
 *  weave, like a screen print), screened (lightens), overlaid (contrast-boosting:
 *  multiplies the shadows + screens the highlights, so the weave shows through while
 *  the print's own contrast is preserved), or darkened (keeps whichever is darker
 *  per channel, so the print only ever deepens the fabric — never lightens it). */
export type PrintBlend = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken'
export const PRINT_BLENDS: PrintBlend[] = ['normal', 'multiply', 'screen', 'overlay', 'darken']

const BLEND_COMPOSITE: Record<PrintBlend, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken'
}

/** Resolve a print's opacity + blend to canvas paint params. Pure + unit-tested. */
export function resolvePrintPaint(p: { opacity?: number; blend?: PrintBlend }): { alpha: number; composite: GlobalCompositeOperation } {
  const alpha = Math.max(0, Math.min(1, p.opacity ?? 1))
  return { alpha, composite: BLEND_COMPOSITE[p.blend ?? 'normal'] ?? 'source-over' }
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
  /** The garment part this print is placed on (body / sleeves / legs). */
  part: PrintPart
  /** Finish: flat graphic · raised embroidery · appliqué patch. */
  style: PrintStyle
  /** Opacity 0…1 (default 1 = opaque). */
  opacity?: number
  /** Blend onto the fabric — normal · multiply · screen (default normal). */
  blend?: PrintBlend
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
export const printIsRaised = (p: Print): boolean => p.style === 'embroidery' || p.style === 'applique' || p.style === 'puff' || p.style === 'enamel-pin'
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
  textileScale?: number
  textileRotation?: number
  textileRepeat?: RepeatMode
  tartan?: TartanKind
  /** Knit colourwork — a tiling fair-isle jacquard or a placed intarsia block. */
  colourwork?: ColourworkChart
  ombre?: OmbreDirection
  wear?: WearKind
  /** Duotone two-tone remap of the fabric/pattern, behind the prints. */
  duotone?: DuotoneKind
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/** Whether the design needs an albedo map — a print, a textile, a tartan, an ombré, a wear, or a duotone finish. */
export function hasArt(c: { prints: Print[]; textile?: TextilePattern; tartan?: TartanKind; colourwork?: ColourworkChart; ombre?: OmbreDirection; wear?: WearKind; duotone?: DuotoneKind }): boolean {
  return !!c.textile || !!c.tartan || !!c.colourwork || !!c.ombre || !!c.wear || !!c.duotone || c.prints.some(printHasContent)
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
  // Opacity + blend onto the fabric (reset by the caller's save/restore). Appliqué is a
  // physical patch, so it stays opaque + normal — only flat/embroidered art blends.
  // appliqué + enamel pin are physical objects on the cloth — always opaque + normal
  if (p.style !== 'applique' && p.style !== 'enamel-pin') {
    const { alpha, composite } = resolvePrintPaint(p)
    ctx.globalAlpha = alpha
    ctx.globalCompositeOperation = composite
  }
  if (p.style === 'enamel-pin') {
    // a hard enamel pin: a bright gold metal rim, glossy enamel fill in the print
    // colour, the motif inlaid in white, and a soft specular gloss arc
    const rad = p.scale * size * 0.55
    ctx.fillStyle = '#e6c163' // polished gold rim
    ctx.beginPath()
    ctx.arc(0, 0, rad, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = hex(p.color) // enamel fill
    ctx.beginPath()
    ctx.arc(0, 0, rad * 0.82, 0, Math.PI * 2)
    ctx.fill()
    drawMotifShape(ctx, p, size, '#ffffff') // inlaid motif
    ctx.strokeStyle = 'rgba(255,255,255,0.55)' // gloss highlight arc, top-left
    ctx.lineWidth = Math.max(1.5, rad * 0.06)
    ctx.beginPath()
    ctx.arc(0, 0, rad * 0.68, Math.PI * 1.02, Math.PI * 1.5)
    ctx.stroke()
    return
  }
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
  if (p.style === 'discharge') {
    // discharge print bleaches the dye where it prints — screen a pale tone onto the fabric
    ctx.globalCompositeOperation = 'screen'
    drawMotifShape(ctx, p, size, shade(p.color, 0.55)) // a pale, washed-out motif
    return
  }
  if (p.style === 'woven') {
    // a digital textile print absorbed into the weave: the motif ink with a fine
    // warp/weft hatch multiplied onto JUST the ink, so the cloth grain shows through
    const tmp = document.createElement('canvas')
    tmp.width = tmp.height = size
    const tc = tmp.getContext('2d')!
    tc.translate(size / 2, size / 2)
    drawMotifShape(tc, p, size, hex(p.color))
    tc.globalCompositeOperation = 'source-atop' // grain only where there is ink
    const step = Math.max(2, size * 0.009)
    tc.lineWidth = 1
    tc.strokeStyle = 'rgba(0,0,0,0.16)' // weft (horizontal) shadow threads
    for (let y = -size / 2; y < size / 2; y += step) { tc.beginPath(); tc.moveTo(-size / 2, y); tc.lineTo(size / 2, y); tc.stroke() }
    tc.strokeStyle = 'rgba(255,255,255,0.1)' // warp (vertical) highlight threads
    for (let x = -size / 2; x < size / 2; x += step) { tc.beginPath(); tc.moveTo(x, -size / 2); tc.lineTo(x, size / 2); tc.stroke() }
    ctx.drawImage(tmp, -size / 2, -size / 2)
    return
  }
  // foil = a bright metallic transfer tone; flat / embroidery / puff draw the plain graphic
  drawMotifShape(ctx, p, size, p.style === 'foil' ? hex(foilTone(p.color)) : hex(p.color))
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
  } else if (p.style === 'enamel-pin') {
    // a hard raised disc — the metal rim ridge highest, a domed enamel centre
    const rad = s * 0.55
    b.fillStyle = '#f2f2f2' // rim ridge (max height)
    b.beginPath()
    b.arc(0, 0, rad, 0, Math.PI * 2)
    b.fill()
    b.fillStyle = '#cfcfcf' // enamel dome, a touch lower than the rim
    b.beginPath()
    b.arc(0, 0, rad * 0.8, 0, Math.PI * 2)
    b.fill()
  } else if (p.style === 'puff') {
    // puff print: a chunky, rounded high-loft — the motif full-white (max height) with a
    // soft blur so it domes like a rubber puff instead of reading as flat thread
    const hadFilter = typeof b.filter === 'string'
    if (hadFilter) b.filter = `blur(${Math.max(2, s * 0.03)}px)`
    drawMotifShape(b, p, size, '#ffffff')
    if (hadFilter) b.filter = 'none'
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
    if (inp.textile) paintTextile(ctx, size, inp.textile, inp.color, 10, inp.textileScale ?? 1, inp.textileRotation ?? 0, inp.textileRepeat ?? 'full-drop') // tiling pattern behind the prints
    if (inp.tartan) paintTartan(ctx, size, inp.tartan) // a real tartan sett (its own palette) behind the prints
    if (inp.colourwork) paintColourwork(ctx, size, inp.colourwork) // knit colourwork over the ground, behind the prints
    if (inp.duotone) paintDuotone(ctx, size, inp.duotone) // two-tone the fabric/pattern (behind the prints, which stay full-colour)
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
