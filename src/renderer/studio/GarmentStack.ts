/**
 * The live stack of garment **layers** worn on one mannequin. Each layer owns its
 * own material, fabric, print and `GarmentController` (its cloth pieces), so many
 * garments simulate + render together. The stack is the runtime twin of the
 * document's `layers[]` — main.ts drives it (add / remove / duplicate / select,
 * edit the active layer) and reads it back for save / export.
 */
import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements, BodyAnchors } from '../avatar/Mannequin'
import type { BodyCollider } from '../cloth/BodyCollider'
import { GarmentController } from '../garment/GarmentController'
import { ClothCollision } from '../cloth/ClothCollision'
import { createFabricMaterial, applyFabric } from '../cloth/FabricMaterial'
import { getFabric, fabricToSolverParams, fabricThickness, interfaceParams, corsetParams, type Fabric } from '../fabric/FabricLibrary'
import { getGarment } from '../garments/registry'
import { garmentPatternSpecs, garmentSleeveSpecs } from '../garments/factory'
import { radiusAt } from '../cloth/Garment'
import { pocketPlacements } from '../garments/decor'
import { buildDesignArt, hasArt, anyRaised, printFromSpec, type DesignArt, type DesignArtInput, type Print, type PrintPart } from '../start/design'
import { buildSwatchTextures, disposeSwatch, type SwatchTextures } from '../fabric/swatch'
import { sparkleParams, makeSparkleNormalMap } from '../fabric/sparkle'
import { quiltParams, makeQuiltNormalMap } from '../fabric/quilt'
import { gradeParams, type GarmentLayerData } from './document'

/** A no-art input — drops a part's design map (no prints, no textile). */
const EMPTY_ART: DesignArtInput = { color: 0xffffff, prints: [] }
/** Bump strength for raised embroidery / appliqué relief. */
const RAISED_BUMP_SCALE = 6
/** Default garment envMapIntensity (matches `createFabricMaterial`) — restored when a sparkle finish is cleared. */
const FABRIC_ENV_INTENSITY = 1.1

const POCKET_LINE = new THREE.LineBasicMaterial({ color: 0x2c2c33 }) // topstitch outline
// Shared closure materials (buttons · zip tape · metal pull) — geometry is per-mesh.
// A shell/plastic button — a clearcoat gives the subtle glossy highlight real buttons have.
const CLOSURE_BUTTON = new THREE.MeshPhysicalMaterial({ color: 0x26262c, metalness: 0, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.32, sheen: 0.2 })
const CLOSURE_HOLE = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.85 }) // sew holes
const CLOSURE_THREAD = new THREE.LineBasicMaterial({ color: 0xdedad0 }) // cross-stitch thread
const CLOSURE_ZIP = new THREE.MeshStandardMaterial({ color: 0x1d1d21, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide })
const CLOSURE_METAL = new THREE.MeshStandardMaterial({ color: 0xc2c2ca, metalness: 0.85, roughness: 0.3 })
// Drawstring cord + metal aglet tip (shared; geometry is per-mesh).
const CORD_MAT = new THREE.MeshStandardMaterial({ color: 0xece7db, roughness: 0.75 })
const AGLET_MAT = new THREE.MeshStandardMaterial({ color: 0xb8b8c0, metalness: 0.8, roughness: 0.35 })
const CORD_LINE = new THREE.LineBasicMaterial({ color: 0xece7db }) // lacing cord
const BONING_LINE = new THREE.LineBasicMaterial({ color: 0x8a8a92 }) // boning channel stitch
const SEAM_LINE = new THREE.LineBasicMaterial({ color: 0x5b5b63 }) // yoke / princess seams
// A button profile lathed once + shared: a slightly domed disc with a rounded rim + a
// recessed centre well (where the holes sit) — reads far more like a real button than a flat disc.
const BUTTON_PROFILE = (() => {
  const R = 0.0088
  const pts = [
    new THREE.Vector2(0, 0.0016), // centre, recessed
    new THREE.Vector2(R * 0.34, 0.0015),
    new THREE.Vector2(R * 0.42, 0.0024), // inner well wall
    new THREE.Vector2(R * 0.82, 0.0028), // domed face
    new THREE.Vector2(R * 0.97, 0.0022), // rounded rim
    new THREE.Vector2(R, 0.001),
    new THREE.Vector2(R, 0) // edge → back
  ]
  return new THREE.LatheGeometry(pts, 28)
})()

const layerMats = (l: StackLayer): THREE.MeshPhysicalMaterial[] => [
  l.material,
  l.sleeveMaterial,
  l.legMaterial,
  l.trimMaterial,
  l.backMaterial,
  l.legBackMaterial
]
const disposeMats = (l: StackLayer): void => {
  for (const m of layerMats(l)) m.dispose()
  l.lining?.dispose()
}
/** Free the print/design canvas textures (every part panel) so they don't leak.
 *  The swatch is *kept* (re-applied after a redraw); dispose it at layer teardown. */
const disposeDesigns = (l: StackLayer): void => {
  for (const d of [l.design, l.sleeveDesign, l.legDesign, l.backDesign, l.legBackDesign]) {
    d?.texture.dispose()
    d?.bump?.dispose()
  }
}

export interface StackLayer {
  data: GarmentLayerData
  /** The body/default fabric (parts fall back to it). */
  fabric: Fabric
  /** Body material (the print/logo lives here). */
  material: THREE.MeshPhysicalMaterial
  /** Per-part materials (used only when a part has its own fabric). */
  sleeveMaterial: THREE.MeshPhysicalMaterial
  legMaterial: THREE.MeshPhysicalMaterial
  /** Back-panel materials (used only when a back panel has its own fabric). */
  backMaterial: THREE.MeshPhysicalMaterial
  legBackMaterial: THREE.MeshPhysicalMaterial
  /** Contrast-trim material (collar/cuff/pocket/hem bands) when `data.trim` is on. */
  trimMaterial: THREE.MeshPhysicalMaterial
  /** Inner "lining" material — a darkened shell offset inward for fabric thickness. */
  lining: THREE.MeshPhysicalMaterial | null
  controller: GarmentController
  design: DesignArt | null
  /** Per-part albedo maps — sleeve/leg prints + textile (built only when that part exists). */
  sleeveDesign: DesignArt | null
  legDesign: DesignArt | null
  /** The back panel's own albedo (back colour + prints) when a back fabric is set. */
  backDesign: DesignArt | null
  /** The leg-back panel's own albedo when a leg-back fabric is set. */
  legBackDesign: DesignArt | null
  /** An imported fabric-photo swatch → seamless tiling PBR (overrides the body look). */
  swatch: SwatchTextures | null
  /** Non-simulated decoration (patch pockets + trim bands) parented to the layer. */
  decor: THREE.Group
  /** Placed prints (logos + text) — runtime (images live here). */
  prints: Print[]
}

export interface LayerSummary {
  name: string
  color: number
  visible: boolean
  active: boolean
  pieces: number
}

/** Editable garment parts (piece groups + back panels + trim). */
export type PartId = 'body' | 'sleeves' | 'legs' | 'trim' | 'back' | 'legBack'

/** Which part a simulated piece belongs to, keyed off its mesh name (drives its material + physics). */
export function partForPiece(name: string): 'sleeves' | 'legs' | 'body' {
  if (/sleeve/i.test(name)) return 'sleeves'
  if (/leg/i.test(name)) return 'legs'
  return 'body'
}

/**
 * The fabric id for a back panel, following its fallback chain: a body `back`
 * panel falls back to the body fabric; a `legBack` panel to the `legs` fabric
 * then the body fabric. (Front panels use the piece's own fabric.)
 */
export function panelFabricId(data: GarmentLayerData, panel: 'back' | 'legBack'): string {
  const pf = data.partFabrics
  if (panel === 'back') return pf?.back?.fabricId ?? data.fabricId
  return pf?.legBack?.fabricId ?? pf?.legs?.fabricId ?? data.fabricId
}

export class GarmentStack {
  readonly layers: StackLayer[] = []
  activeIndex = 0
  private gravityY = 9.81
  private windX = 0
  private windZ = 0

  constructor(
    private readonly scene: THREE.Scene,
    private readonly colliders: Capsule[],
    private readonly measurements: Measurements,
    private readonly bodyCollider: BodyCollider | null,
    private readonly anchors: () => BodyAnchors | null = () => null
  ) {}

  get active(): StackLayer {
    return this.layers[this.activeIndex]
  }
  get size(): number {
    return this.layers.length
  }

  /** The albedo input for a garment part — its base colour + only the prints
   * placed on *that* part + the (whole-garment) textile pattern. */
  private artInputFor(l: StackLayer, part: PrintPart): DesignArtInput {
    const color = part === 'body' ? l.data.color : this.partFabric(l, part).color
    return { color, prints: l.prints.filter((p) => (p.part ?? 'body') === part), textile: l.data.textile }
  }
  /** The albedo input for a back panel — its own colour + the owning part's prints. */
  private artInputForBack(l: StackLayer, panel: 'back' | 'legBack'): DesignArtInput {
    const part: PrintPart = panel === 'back' ? 'body' : 'legs'
    return { color: this.panelFabric(l, panel).color, prints: l.prints.filter((p) => (p.part ?? 'body') === part), textile: l.data.textile }
  }
  /** Whether the live garment actually has pieces for a part (skip building unused maps). */
  private hasPart(l: StackLayer, part: 'sleeves' | 'legs'): boolean {
    return l.controller.getPieces().some((p) => partForPiece(p.name) === part)
  }
  /**
   * Apply a design map (prints + textile) to one material: build/redraw it when
   * there's art, else drop it. Returns the (kept or nulled) design to store back.
   */
  private applyPartDesign(mat: THREE.MeshPhysicalMaterial, current: DesignArt | null, input: DesignArtInput): DesignArt | null {
    if (hasArt(input)) {
      const d = current ?? buildDesignArt(input)
      mat.map = d.texture
      mat.color.set(0xffffff) // the design canvas owns the base colour
      d.redraw(input) // fresh input → the base colour tracks a recolour (not stale)
      // raised motifs (embroidery / appliqué) → a bump relief that catches the light
      mat.bumpMap = anyRaised(input.prints) ? d.bump : null
      mat.bumpScale = RAISED_BUMP_SCALE
      mat.needsUpdate = true
      return d
    }
    if (current) {
      mat.map = null
      mat.bumpMap = null
      current.texture.dispose()
      current.bump?.dispose()
      mat.needsUpdate = true
    }
    return null
  }

  /** The fabric for a garment part (its override, or the body default). */
  private partFabric(l: StackLayer, part: 'sleeves' | 'legs'): Fabric {
    const pf = l.data.partFabrics?.[part]
    return pf ? { ...getFabric(pf.fabricId), color: pf.color } : l.fabric
  }

  /** The fabric that drives a piece's cloth physics, by piece name (part override, or body). */
  private pieceFabric(l: StackLayer, name: string): Fabric {
    const part = partForPiece(name)
    return part === 'body' ? l.fabric : this.partFabric(l, part)
  }

  /** The current { fabricId, color } for a part (body/trim/sleeves/legs/back/legBack). */
  partData(part: PartId): { fabricId: string; color: number } {
    const d = this.active.data
    if (part === 'body') return { fabricId: d.fabricId, color: d.color }
    if (part === 'trim') return { fabricId: d.trimFabricId ?? d.fabricId, color: d.trimColor ?? d.color }
    // legBack falls back to the legs (front) fabric, then the body default.
    if (part === 'legBack') return d.partFabrics?.legBack ?? d.partFabrics?.legs ?? { fabricId: d.fabricId, color: d.color }
    return d.partFabrics?.[part] ?? { fabricId: d.fabricId, color: d.color }
  }
  /** Assign a fabric and/or colour to a part of the active layer (visual). */
  setPart(part: PartId, opts: { fabricId?: string; color?: number }): void {
    const l = this.active
    const cur = this.partData(part)
    const next = { fabricId: opts.fabricId ?? cur.fabricId, color: opts.color ?? cur.color }
    if (part === 'body') {
      l.data.fabricId = next.fabricId
      l.data.color = next.color
      l.fabric = { ...getFabric(next.fabricId), color: next.color }
    } else if (part === 'trim') {
      l.data.trim = true
      l.data.trimFabricId = next.fabricId
      l.data.trimColor = next.color
    } else {
      ;(l.data.partFabrics ??= {})[part] = next
    }
    // applyLook redraws every part's design canvas with the fresh colour (incl. any
    // recoloured back / sleeve / leg panel), so no design rebuild is needed here.
    this.applyLook(l)
    this.buildDecor(l) // trim bands / pocket material depend on trim
    // A piece fabric swap changes drape, so re-derive its physics. Back panels are
    // visual-only (they share the piece's sim), and colour-only edits don't drape.
    if (opts.fabricId && (part === 'body' || part === 'sleeves' || part === 'legs')) l.controller.setFabricPhysics()
  }

  /** The fabric for a back panel (its override, else the piece's front fabric). */
  private panelFabric(l: StackLayer, panel: 'back' | 'legBack'): Fabric {
    const ov = panel === 'back' ? l.data.partFabrics?.back : l.data.partFabrics?.legBack
    if (ov) return { ...getFabric(ov.fabricId), color: ov.color }
    return panel === 'back' ? l.fabric : this.partFabric(l, 'legs')
  }
  /**
   * Assign each piece mesh its material by piece name. When a back panel has its
   * own fabric, the body/leg mesh gets a `[front, back]` material array — the two
   * geometry groups from `finishTube` (front = +z, back = −z). The front keeps the
   * print. Otherwise a single material renders both groups.
   */
  private applyPartMaterials(l: StackLayer): void {
    const hasBack = !!l.data.partFabrics?.back
    const hasLegBack = !!l.data.partFabrics?.legBack
    for (const { name, mesh } of l.controller.getPieces()) {
      const part = partForPiece(name)
      if (part === 'sleeves') mesh.material = l.sleeveMaterial
      else if (part === 'legs') mesh.material = hasLegBack ? [l.legMaterial, l.legBackMaterial] : l.legMaterial
      else mesh.material = hasBack ? [l.material, l.backMaterial] : l.material
    }
  }

  /** (Re)apply a layer's per-part fabric looks + trim + the print to its materials. */
  applyLook(l: StackLayer): void {
    applyFabric(l.material, l.fabric) // body / default
    applyFabric(l.sleeveMaterial, this.partFabric(l, 'sleeves'))
    applyFabric(l.legMaterial, this.partFabric(l, 'legs'))
    applyFabric(l.backMaterial, this.panelFabric(l, 'back'))
    applyFabric(l.legBackMaterial, this.panelFabric(l, 'legBack'))
    const trimFab: Fabric = l.data.trimFabricId
      ? { ...getFabric(l.data.trimFabricId), color: l.data.trimColor ?? 0x1a1a22 }
      : { ...l.fabric, color: l.data.trimColor ?? 0x1a1a22 }
    applyFabric(l.trimMaterial, trimFab)

    // Per-part albedo: prints (and the textile pattern) render on the piece they're
    // placed on — the body, the sleeves, or the legs — each with its own base colour.
    l.design = this.applyPartDesign(l.material, l.design, this.artInputFor(l, 'body'))
    l.sleeveDesign = this.hasPart(l, 'sleeves')
      ? this.applyPartDesign(l.sleeveMaterial, l.sleeveDesign, this.artInputFor(l, 'sleeves'))
      : this.applyPartDesign(l.sleeveMaterial, l.sleeveDesign, EMPTY_ART)
    l.legDesign = this.hasPart(l, 'legs')
      ? this.applyPartDesign(l.legMaterial, l.legDesign, this.artInputFor(l, 'legs'))
      : this.applyPartDesign(l.legMaterial, l.legDesign, EMPTY_ART)
    // A back panel only needs its own albedo when it has its own fabric (a separate
    // material/geometry group); otherwise the front material renders both groups.
    l.backDesign = l.data.partFabrics?.back
      ? this.applyPartDesign(l.backMaterial, l.backDesign, this.artInputForBack(l, 'back'))
      : this.applyPartDesign(l.backMaterial, l.backDesign, EMPTY_ART)
    l.legBackDesign = l.data.partFabrics?.legBack
      ? this.applyPartDesign(l.legBackMaterial, l.legBackDesign, this.artInputForBack(l, 'legBack'))
      : this.applyPartDesign(l.legBackMaterial, l.legBackDesign, EMPTY_ART)
    // An imported fabric-photo swatch clothes the *whole* garment — its seamless
    // tiling albedo + derived normal + roughness override the procedural fabric
    // on every part (and any print/textile map, which tiles at a different rate).
    if (l.swatch) {
      for (const m of [l.material, l.sleeveMaterial, l.legMaterial, l.backMaterial, l.legBackMaterial]) {
        m.map = l.swatch.albedo
        m.normalMap = l.swatch.normal
        m.normalScale.set(1, 1)
        m.roughness = l.swatch.roughness
        m.bumpMap = null // the swatch owns the whole surface (no raised-motif relief under it)
        m.color.set(0xffffff)
        m.needsUpdate = true
      }
    }
    // Surface finish over every part material — keeps the albedo (prints/textile)
    // but overrides the shading. Sparkle (sequins/beading/foil) = a faceted normal
    // + metallic glints; else quilting (channel/diamond/box) = a pillow-loft normal;
    // else the plain matte fabric (weave normal already set by applyFabric).
    const sp = l.data.sparkle ? sparkleParams(l.data.sparkle) : null
    const sparkleNormalMap = l.data.sparkle ? makeSparkleNormalMap(l.data.sparkle) : null
    const ql = !l.data.sparkle && l.data.quilt ? quiltParams(l.data.quilt) : null
    const quiltNormalMap = ql && l.data.quilt ? makeQuiltNormalMap(l.data.quilt) : null
    for (const m of [l.material, l.sleeveMaterial, l.legMaterial, l.backMaterial, l.legBackMaterial]) {
      // metallic props applyFabric doesn't touch — default matte unless sparkle sets them
      m.metalness = sp ? sp.metalness : 0
      m.clearcoat = sp ? sp.clearcoat : 0
      m.clearcoatRoughness = sp ? sp.clearcoatRoughness : 0
      m.envMapIntensity = sp ? sp.envMapIntensity : FABRIC_ENV_INTENSITY
      if (sp && sparkleNormalMap) {
        m.normalMap = sparkleNormalMap
        m.normalScale.set(sp.normalStrength, sp.normalStrength)
        m.roughness = sp.roughness
        m.anisotropy = sp.anisotropy
      } else if (ql && quiltNormalMap) {
        m.normalMap = quiltNormalMap
        m.normalScale.set(ql.normalStrength, ql.normalStrength)
        m.roughness = ql.roughness
      }
      m.needsUpdate = true
    }
    l.material.needsUpdate = true
    l.backMaterial.needsUpdate = true
    this.applyPartMaterials(l)
    this.updateLining(l)
    l.controller.setStitchColor(this.stitchColor(l))
  }

  /** Apply an imported fabric-photo swatch to the active layer (seamless PBR). */
  setSwatch(l: StackLayer, source: HTMLImageElement | HTMLCanvasElement): void {
    disposeSwatch(l.swatch)
    l.swatch = buildSwatchTextures(source)
    this.applyLook(l)
  }
  /** Remove the fabric-photo swatch, restoring the procedural fabric look. */
  clearSwatch(l: StackLayer): void {
    if (!l.swatch) return
    disposeSwatch(l.swatch)
    l.swatch = null
    for (const m of [l.material, l.sleeveMaterial, l.legMaterial, l.backMaterial, l.legBackMaterial]) m.map = null
    this.refreshDesign(l) // rebuild the normal fabric + any print/textile map
  }

  /**
   * Topstitch thread colour: the contrast trim colour when trim is on, else a tonal
   * **contrast** of the fabric — a lighter thread on dark cloth, a darker thread on
   * light cloth (the classic visible topstitch), desaturated so it stays tasteful.
   */
  private stitchColor(l: StackLayer): number {
    if (l.data.trim) return l.data.trimColor ?? 0x1a1a22
    const hsl = { h: 0, s: 0, l: 0 }
    new THREE.Color(l.fabric.color).getHSL(hsl)
    const tl = hsl.l < 0.5 ? Math.min(1, hsl.l + 0.4) : Math.max(0, hsl.l - 0.4)
    return new THREE.Color().setHSL(hsl.h, hsl.s * 0.55, tl).getHex()
  }

  /** Rebuild a layer's print from scratch (image/text changed) + reapply. */
  refreshDesign(l: StackLayer): void {
    disposeDesigns(l)
    l.design = null
    l.sleeveDesign = null
    l.legDesign = null
    l.backDesign = null
    l.legBackDesign = null
    this.applyLook(l)
  }

  private applyVisibility(l: StackLayer): void {
    for (const m of l.controller.getMeshes()) m.visible = l.data.visible
    l.decor.visible = l.data.visible
  }

  /** Rebuild a layer's non-sim decoration (patch pockets + contrast-trim bands). */
  private buildDecor(l: StackLayer): void {
    for (const c of l.decor.children) {
      const anyc = c as THREE.Mesh | THREE.LineSegments
      anyc.geometry?.dispose()
    }
    l.decor.clear()
    const trimOn = !!l.data.trim
    const pocketMat = trimOn ? l.trimMaterial : l.material

    if (getGarment(l.data.garmentType).hood) this.buildHood(l)

    if (l.data.pocket) this.buildPocket(l, pocketMat)

    // contrast-trim bands at the hem + neckline (thin rings in the trim material)
    if (trimOn) {
      const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
      const band = (radius: number, y: number): void => {
        const geo = new THREE.TorusGeometry(Math.max(0.03, radius + 0.006), 0.014, 8, 48)
        const ring = new THREE.Mesh(geo, l.trimMaterial)
        ring.rotation.x = Math.PI / 2
        ring.position.set(0, y, 0)
        ring.castShadow = true
        l.decor.add(ring)
      }
      if (spec) {
        band(spec.radiusBottom, spec.bottomY) // hem band
        if (spec.neckline) band(spec.radiusTop * 0.62, (spec.shoulderY ?? spec.topY) - 0.04) // neck band
      }
    }

    if (l.data.closure) this.buildClosure(l)
    if (l.data.collar) this.buildCollar(l)
    if (l.data.waistband) this.buildWaistband(l)
    if (l.data.drawstring) this.buildDrawstring(l)
    if (l.data.facing) this.buildFacing(l)
    if (l.data.ruffles) this.buildFrill(l)
    if (l.data.boning) this.buildBoning(l)
    if (l.data.ribbing) this.buildRibbing(l)
    if (l.data.yoke || l.data.princess) this.buildSeams(l)
  }

  /**
   * Structural seams drawn on the bodice: a horizontal **yoke** seam across the
   * upper body, and **princess** shaping seams — curved vertical lines front + back
   * from the shoulders over the bust to the waist (where a fitted piece gets its
   * shape from seams, not just darts). Topstitch-style lines that hug the surface.
   */
  private buildSeams(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const yTop = spec.shoulderY ?? spec.topY
    const yHem = spec.bottomY
    const surfacePoint = (a: number, y: number): THREE.Vector3 => {
      const t = THREE.MathUtils.clamp((yTop - y) / (yTop - yHem || 1), 0, 1)
      const r = radiusAt(spec, t) + 0.004
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
    }
    const pts: THREE.Vector3[] = []
    if (l.data.yoke) {
      const yokeY = yTop - 0.09 // shoulder-blade line
      const seg = 48
      for (let i = 0; i < seg; i++) {
        pts.push(surfacePoint((i / seg) * Math.PI * 2, yokeY), surfacePoint(((i + 1) / seg) * Math.PI * 2, yokeY))
      }
    }
    if (l.data.princess) {
      const y0 = yTop - 0.03
      const y1 = Math.max(this.measurements.waistY, yHem + 0.02)
      const SEG = 12
      for (const a of [Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, (3 * Math.PI) / 2 - 0.5, (3 * Math.PI) / 2 + 0.5]) {
        for (let s = 0; s < SEG; s++) {
          pts.push(surfacePoint(a, y0 - (y0 - y1) * (s / SEG)), surfacePoint(a, y0 - (y0 - y1) * ((s + 1) / SEG)))
        }
      }
    }
    l.decor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), SEAM_LINE))
  }

  /** A ribbed knit band (sweatshirt trim) from `a`→`b` — a short tube whose cross
   * section is finely fluted so it reads as knit ribbing. */
  private ribbedBand(l: StackLayer, a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material): void {
    const axis = new THREE.Vector3().subVectors(b, a)
    axis.multiplyScalar(1 / (axis.length() || 1))
    const up = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const u = new THREE.Vector3().crossVectors(up, axis).normalize()
    const v = new THREE.Vector3().crossVectors(axis, u).normalize()
    const ribN = 32
    const RAD = 128
    const RINGS = 3
    const ribAmp = 0.05
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    for (let iy = 0; iy < RINGS; iy++) {
      const t = iy / (RINGS - 1)
      const cx = a.x + (b.x - a.x) * t
      const cy = a.y + (b.y - a.y) * t
      const cz = a.z + (b.z - a.z) * t
      for (let ix = 0; ix < RAD; ix++) {
        const ang = (ix / RAD) * Math.PI * 2
        const r = radius * (1 + ribAmp * (0.5 - 0.5 * Math.cos(ang * ribN))) // fine rib flutes
        const c = Math.cos(ang) * r
        const s = Math.sin(ang) * r
        pos.push(cx + u.x * c + v.x * s, cy + u.y * c + v.y * s, cz + u.z * c + v.z * s)
        uv.push(ix / RAD, t)
      }
    }
    for (let iy = 0; iy < RINGS - 1; iy++) {
      for (let ix = 0; ix < RAD; ix++) {
        const ixr = (ix + 1) % RAD
        const aI = iy * RAD + ix
        const bI = iy * RAD + ixr
        const cI = (iy + 1) * RAD + ix
        const dI = (iy + 1) * RAD + ixr
        idx.push(aI, cI, bI, bI, cI, dI)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.castShadow = true
    mesh.receiveShadow = true
    l.decor.add(mesh)
  }

  /** Knit ribbing trims — ribbed bands at the hem, the collar (crew), and the sleeve cuffs. */
  private buildRibbing(l: StackLayer): void {
    const def = getGarment(l.data.garmentType)
    const graded = gradeParams(l.data)
    const specs = garmentPatternSpecs(def, graded, this.measurements, this.colliders)
    const mat = l.data.trim ? l.trimMaterial : l.material
    const V = THREE.Vector3
    const body = specs.body[0]
    if (body) {
      this.ribbedBand(l, new V(0, body.bottomY + 0.05, 0), new V(0, body.bottomY - 0.002, 0), body.radiusBottom, mat) // hem band
      if (body.neckline) {
        const nY = (body.shoulderY ?? body.topY) - 0.02
        this.ribbedBand(l, new V(0, nY + 0.03, 0), new V(0, nY - 0.02, 0), body.radiusTop * 0.6, mat) // collar band
      }
    }
    for (const sv of garmentSleeveSpecs(def, graded, this.colliders)) {
      const axis = new V().subVectors(sv.b, sv.a).normalize()
      const inner = new V().copy(sv.b).addScaledVector(axis, -0.05) // 5 cm up from the cuff
      this.ribbedBand(l, sv.b.clone(), inner, sv.radiusEnd, mat) // cuff band
    }
  }

  /**
   * A structured/corseted bodice: vertical **boning channels** running the bust →
   * waist around the piece (a gap left at centre-back), plus **criss-cross lacing**
   * up the centre back. Rendered as topstitch-style lines + a cord.
   */
  private buildBoning(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const yTop = (spec.shoulderY ?? spec.topY) - 0.03
    const yWaist = this.measurements.waistY
    const H = yTop - yWaist
    if (H < 0.08) return
    const rw = spec.radiusWaist ?? spec.radiusTop * 0.8
    const rAt = (t: number): number => spec.radiusTop + (rw - spec.radiusTop) * t + 0.004 // bust→waist, proud

    // vertical boning channels (skip a ~40° gap at centre-back for the lacing)
    const N = 12
    const backGap = 0.35
    const chan: THREE.Vector3[] = []
    const SEG = 6
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      let da = a - (3 * Math.PI) / 2
      da = Math.atan2(Math.sin(da), Math.cos(da))
      if (Math.abs(da) < backGap) continue // leave the centre-back open for lacing
      for (let s = 0; s < SEG; s++) {
        const t0 = s / SEG
        const t1 = (s + 1) / SEG
        chan.push(new THREE.Vector3(Math.cos(a) * rAt(t0), yTop - H * t0, Math.sin(a) * rAt(t0)))
        chan.push(new THREE.Vector3(Math.cos(a) * rAt(t1), yTop - H * t1, Math.sin(a) * rAt(t1)))
      }
    }
    l.decor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(chan), BONING_LINE))

    // criss-cross lacing up the centre back (-z), two rows of eyelets + a zig-zag cord
    const rows = 7
    const dx = 0.02
    const lace: THREE.Vector3[] = []
    const eye = (side: number, i: number): THREE.Vector3 => {
      const t = i / (rows - 1)
      const r = rAt(t) + 0.006
      return new THREE.Vector3(side * dx, yTop - H * t, -r)
    }
    for (let i = 0; i < rows; i++) {
      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0015, 6, 12), AGLET_MAT)
        ring.position.copy(eye(side, i))
        l.decor.add(ring)
      }
      if (i < rows - 1) {
        lace.push(eye(-1, i), eye(1, i + 1), eye(1, i), eye(-1, i + 1)) // the X
      }
    }
    l.decor.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lace), CORD_LINE))
  }

  /**
   * A hem frill — a flared, scalloped band attached at the hem that ruffles out
   * and down. `frillStyle` sets it: a gathered **ruffle** (many small waves), a
   * flared **flounce** (deeper, fewer waves), or fluted **godet** (big godet
   * points). Built as a wrapped 2-ring band in the garment's own fabric.
   */
  private buildFrill(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const style = l.data.frillStyle ?? 'ruffle'
    const p = {
      ruffle: { drop: 0.085, flare: 1.28, waves: 26, ampR: 0.03, ampY: 0.012 },
      flounce: { drop: 0.15, flare: 1.7, waves: 13, ampR: 0.05, ampY: 0.03 },
      godet: { drop: 0.13, flare: 1.85, waves: 8, ampR: 0.07, ampY: 0.05 }
    }[style]
    const hemR = spec.radiusBottom
    const hemY = spec.bottomY
    const RAD = 96
    const ROWS = 4
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    for (let iy = 0; iy < ROWS; iy++) {
      const t = iy / (ROWS - 1) // 0 = hem, 1 = frill edge
      const flare = 1 + (p.flare - 1) * t
      for (let ix = 0; ix < RAD; ix++) {
        const a = (ix / RAD) * Math.PI * 2
        const r = hemR * flare + t * p.ampR * Math.sin(a * p.waves)
        const y = hemY - p.drop * t + t * p.ampY * Math.cos(a * p.waves)
        pos.push(Math.cos(a) * r, y, Math.sin(a) * r)
        uv.push(ix / RAD, t)
      }
    }
    for (let iy = 0; iy < ROWS - 1; iy++) {
      for (let ix = 0; ix < RAD; ix++) {
        const ixr = (ix + 1) % RAD
        const a = iy * RAD + ix
        const b = iy * RAD + ixr
        const c = (iy + 1) * RAD + ix
        const d = (iy + 1) * RAD + ixr
        idx.push(a, c, b, b, c, d)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
    const frill = new THREE.Mesh(geo, l.data.trim ? l.trimMaterial : l.material)
    frill.frustumCulled = false
    frill.castShadow = true
    frill.receiveShadow = true
    l.decor.add(frill)
  }

  /** Where a bottom's waist sits + its radius (hips for trousers, waist for skirts). */
  private waistRing(l: StackLayer): { y: number; r: number; front: number } {
    const m = this.measurements
    const hasLegs = getGarment(l.data.garmentType).pieces.some((p) => p.kind === 'legTubes')
    const y = hasLegs ? m.hipY : m.waistY
    const r = (hasLegs ? m.hipR : m.waistR) + (l.data.ease ?? 0) + 0.008
    return { y, r, front: r * 0.92 }
  }

  /** A constructed waistband — a clean band at the top of a skirt/trouser. */
  private buildWaistband(l: StackLayer): void {
    const { y, r } = this.waistRing(l)
    const mat = l.data.trim ? l.trimMaterial : l.material
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 40, 1, true), mat)
    band.position.set(0, y + 0.01, 0)
    band.castShadow = true
    band.receiveShadow = true
    l.decor.add(band)
  }

  /** A neckline facing — a clean inner finish band just inside the neck opening. */
  private buildFacing(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec || !spec.neckline) return
    const neckR = spec.radiusTop * 0.6
    const neckY = (spec.shoulderY ?? spec.topY) - 0.03
    const facing = new THREE.Mesh(new THREE.CylinderGeometry(neckR * 0.98, neckR * 0.98, 0.03, 36, 1, true), l.lining ?? l.material)
    facing.position.set(0, neckY - 0.012, 0)
    facing.receiveShadow = true
    l.decor.add(facing)
  }

  /**
   * A functional drawstring: a cord threaded around the waist (bottoms) or the
   * hood/neck (hooded tops), with two ends hanging down the front finished with
   * metal aglets.
   */
  private buildDrawstring(l: StackLayer): void {
    const m = this.measurements
    const hooded = !!getGarment(l.data.garmentType).hood
    const y = hooded ? m.neckY - 0.02 : this.waistRing(l).y + 0.012
    const r = hooded ? m.chestR * 0.62 : this.waistRing(l).r
    const fz = r * 0.94
    // the cord ring at the opening
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 8, 56), CORD_MAT)
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, y, 0)
    l.decor.add(ring)
    // two hanging ends + aglets at the centre front
    for (const sx of [-1, 1]) {
      const len = 0.15
      const end = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 8), CORD_MAT)
      end.position.set(sx * 0.016, y - len / 2, fz)
      l.decor.add(end)
      const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.004, 0.016, 10), AGLET_MAT)
      aglet.position.set(sx * 0.016, y - len - 0.006, fz)
      aglet.castShadow = true
      l.decor.add(aglet)
    }
  }

  /**
   * The collar / lapel library: a shaped collar around the neckline whose form
   * depends on `collarStyle` — a stand (band / mandarin), a folded shirt collar,
   * a flat rounded Peter-Pan, or fold-back notch lapels down a V front. Non-sim
   * decoration in the garment's (or trim) fabric, sized from the neck spec.
   */
  private buildCollar(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const style = l.data.collarStyle ?? 'band'
    const neckR = Math.max(0.05, spec.radiusTop * 0.6)
    const neckY = (spec.shoulderY ?? spec.topY) - 0.02
    const mat = l.data.trim ? l.trimMaterial : l.material
    const add = (geo: THREE.BufferGeometry, y: number, rotX = 0): void => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(0, y, 0)
      m.rotation.x = rotX
      m.castShadow = true
      m.receiveShadow = true
      l.decor.add(m)
    }
    if (style === 'band' || style === 'mandarin') {
      const h = style === 'mandarin' ? 0.06 : 0.038
      const topR = style === 'mandarin' ? neckR * 0.96 : neckR * 1.02
      add(new THREE.CylinderGeometry(topR, neckR * 1.04, h, 40, 1, true), neckY + h / 2)
    } else if (style === 'shirt') {
      const sh = 0.026 // stand height
      add(new THREE.CylinderGeometry(neckR * 1.03, neckR * 1.05, sh, 40, 1, true), neckY + sh / 2)
      add(new THREE.CylinderGeometry(neckR * 1.05, neckR * 1.55, 0.055, 40, 1, true), neckY + sh + 0.018) // flared fold-down
    } else if (style === 'peterpan') {
      add(new THREE.RingGeometry(neckR * 1.02, neckR * 1.95, 44, 1), neckY - 0.005, -Math.PI / 2 + 0.28) // flat, front dips
    } else {
      // notch: fold-back lapels down the V front + a small back stand
      this.buildLapels(l, neckY, mat)
      add(new THREE.CylinderGeometry(neckR * 1.02, neckR * 1.04, 0.03, 40, 1, true, Math.PI * 0.72, Math.PI * 1.56), neckY + 0.015) // back-only stand
    }
  }

  /**
   * The pocket library at each placement: a flat **patch**, a single **welt** or
   * double **jetted** lip (inset slit pockets), a patch + **flap**, or a 3D **bellows**
   * (cargo) box + flap. Non-sim decoration in the garment (or trim) fabric.
   */
  private buildPocket(l: StackLayer, mat: THREE.Material): void {
    const style = l.data.pocketStyle ?? 'patch'
    const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number): void => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      l.decor.add(m)
    }
    const stitch = (geo: THREE.BufferGeometry, x: number, y: number, z: number): void => {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), POCKET_LINE)
      e.position.set(x, y, z)
      l.decor.add(e)
    }
    for (const p of pocketPlacements(getGarment(l.data.garmentType), this.measurements)) {
      if (style === 'welt' || style === 'jetted') {
        const lipH = style === 'jetted' ? 0.007 : 0.014
        const oy = p.y + p.h * 0.2
        const top = new THREE.PlaneGeometry(p.w, lipH)
        add(top, p.x, oy, p.z + 0.001)
        stitch(top, p.x, oy, p.z + 0.0025)
        if (style === 'jetted') {
          const bot = new THREE.PlaneGeometry(p.w, lipH)
          add(bot, p.x, oy - lipH - 0.006, p.z + 0.001)
          stitch(bot, p.x, oy - lipH - 0.006, p.z + 0.0025)
        }
      } else {
        const bellows = style === 'bellows'
        const body = bellows ? new THREE.BoxGeometry(p.w, p.h, 0.022) : new THREE.PlaneGeometry(p.w, p.h)
        const bz = bellows ? p.z + 0.011 : p.z
        add(body, p.x, p.y, bz)
        stitch(body, p.x, p.y, bz + 0.0015)
        if (style === 'flap' || bellows) {
          const flapH = p.h * 0.4
          const flap = new THREE.PlaneGeometry(p.w * 1.04, flapH)
          const fy = p.y + p.h / 2 - flapH / 2 + 0.006
          const fz = bellows ? p.z + 0.023 : p.z + 0.003
          add(flap, p.x, fy, fz)
          stitch(flap, p.x, fy, fz + 0.0015)
        }
      }
    }
  }

  /** Two flat fold-back lapels forming a V/notch down the chest (jacket front). */
  private buildLapels(l: StackLayer, neckY: number, mat: THREE.Material): void {
    const m = this.measurements
    const fz = m.chestR + 0.014 // sit proud of the draped jacket front
    for (const s of [-1, 1]) {
      const p = [
        s * 0.02, neckY + 0.02, fz, // top inner (near centre-front neck)
        s * m.chestR * 0.95, neckY - 0.01, fz - 0.012, // top outer (shoulder side)
        s * m.chestR * 0.72, m.chestY, fz, // bottom outer
        s * 0.03, m.chestY + 0.04, fz + 0.008 // bottom inner (toward centre front)
      ]
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
      geo.setIndex([0, 1, 2, 0, 2, 3])
      geo.computeVertexNormals()
      const lapel = new THREE.Mesh(geo, mat)
      lapel.castShadow = true
      lapel.receiveShadow = true
      l.decor.add(lapel)
    }
  }

  /**
   * A real front closure: a centre-front placket that hugs the garment front (a
   * curved ribbon following the tube radius), with either a **column of buttons**
   * or a **zip tape + metal pull** (chosen by the garment's `closureStyle`). Non-sim
   * decoration, sized/placed from the garment's tube spec so it fits any figure/size.
   */
  private buildClosure(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const style = getGarment(l.data.garmentType).closureStyle ?? 'button'
    const yTop = (spec.shoulderY ?? spec.topY) - (spec.neckline ? 0.1 : 0.04)
    const yBot = spec.bottomY + 0.015
    if (yTop - yBot < 0.06) return
    const rTop = spec.radiusTop
    const rBot = spec.radiusBottom
    const frontZ = (y: number): number => {
      const t = THREE.MathUtils.clamp((y - yBot) / (yTop - yBot), 0, 1)
      return rBot + (rTop - rBot) * t + 0.011 // sit proud of the draped front surface
    }
    // Curved placket ribbon down the centre front (hugs the front bulge).
    const hw = (style === 'zip' ? 0.022 : 0.034) / 2
    const segs = 12
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= segs; i++) {
      const y = yBot + ((yTop - yBot) * i) / segs
      const z = frontZ(y)
      pos.push(-hw, y, z, hw, y, z)
      if (i < segs) {
        const a = i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const bandGeo = new THREE.BufferGeometry()
    bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    bandGeo.setIndex(idx)
    bandGeo.computeVertexNormals()
    const band = new THREE.Mesh(bandGeo, style === 'zip' ? CLOSURE_ZIP : l.data.trim ? l.trimMaterial : l.material)
    band.castShadow = true
    band.receiveShadow = true
    l.decor.add(band)
    if (style === 'zip') {
      const py = yTop - 0.035
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.005), CLOSURE_METAL)
      pull.position.set(0, py, frontZ(py) + 0.006)
      pull.castShadow = true
      l.decor.add(pull)
    } else {
      const n = Math.max(3, Math.round((yTop - yBot) / 0.085))
      for (let i = 0; i < n; i++) {
        const y = yBot + ((yTop - yBot) * (i + 0.5)) / n
        const faceZ = frontZ(y) + 0.006
        // domed shell button body (clone the shared lathe so per-rebuild disposal is safe)
        const btn = new THREE.Mesh(BUTTON_PROFILE.clone(), CLOSURE_BUTTON)
        btn.rotation.x = Math.PI / 2 // domed face toward the front (+z)
        btn.position.set(0, y, faceZ)
        btn.castShadow = true
        btn.receiveShadow = true
        l.decor.add(btn)
        // four sew holes in the recessed centre well + a cross-stitch thread
        const off = 0.0024
        const holeZ = faceZ + 0.0016
        for (const [hx, hy] of [[-off, off], [off, off], [-off, -off], [off, -off]] as [number, number][]) {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.0012, 8), CLOSURE_HOLE)
          hole.rotation.x = Math.PI / 2
          hole.position.set(hx, y + hy, holeZ)
          l.decor.add(hole)
        }
        const tz = holeZ + 0.0007
        const thread = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-off, y + off, tz), new THREE.Vector3(off, y - off, tz),
          new THREE.Vector3(off, y + off, tz), new THREE.Vector3(-off, y - off, tz)
        ])
        l.decor.add(new THREE.LineSegments(thread, CLOSURE_THREAD))
      }
    }
  }

  /**
   * A real fallen-back hood: a draped cowl behind the neck. Built from the belly
   * band of a sphere (poles trimmed) covering ~230° around the back, elongated
   * vertically so it hangs down the upper back. Positioned + sized from the body
   * so it fits any figure/size. Non-sim decoration in the garment's own fabric.
   */
  private buildHood(l: StackLayer): void {
    const m = this.measurements
    const hr = m.chestR * 1.05 // cowl radius — a touch wider than the neck
    const geo = new THREE.SphereGeometry(hr, 28, 20, Math.PI * 0.86, Math.PI * 1.28, Math.PI * 0.14, Math.PI * 0.74)
    geo.scale(1, 1.35, 0.92) // taller drape, slightly flattened front-to-back
    const hood = new THREE.Mesh(geo, l.material)
    hood.position.set(0, m.shoulderY - hr * 0.18, -m.chestR * 0.5)
    hood.castShadow = true
    hood.receiveShadow = true
    l.decor.add(hood)
  }

  /**
   * A material for the inner "lining" shell: a darkened copy of the fabric look,
   * pushed **inward** by the fabric's physical thickness in the vertex shader.
   * The garment tube geometry's normals point **inward** (toward the body axis),
   * so we add along `objectNormal` to move the shell inside the outer surface —
   * otherwise the map-less shell would sit *outside* and hide the albedo (prints /
   * textiles). Paired with the (double-sided) outer surface, this gives every
   * garment real thickness so hems/necklines/openings don't read paper-thin. The
   * push distance is a uniform kept on `userData` so it can be re-tuned in place.
   */
  private makeLiningMaterial(thickness: number): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({ metalness: 0, side: THREE.DoubleSide, envMapIntensity: 1.0 })
    const uThickness = { value: thickness }
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uThickness = uThickness
      shader.vertexShader = 'uniform float uThickness;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed += objectNormal * uThickness;'
      )
    }
    mat.userData.uThickness = uThickness
    return mat
  }

  /**
   * (Re)build the fabric-thickness lining: keep one lining material per layer whose
   * look tracks the body fabric (darkened for an inside shadow), and attach it as a
   * child shell to every simulated piece mesh (sharing the live geometry, so it
   * follows the sim for free). Idempotent — pieces created by `rebuild` get a shell;
   * `applyLook` just re-syncs the material in place (no shader recompile).
   */
  private updateLining(l: StackLayer): void {
    // Sheer fabrics (chiffon/organza) stay see-through — an opaque inner shell would
    // kill the translucency, and they're thin + floaty anyway. Drop any lining shells.
    if (l.fabric.transmission > 0.25) {
      for (const { mesh } of l.controller.getPieces()) {
        for (const c of mesh.children.filter((ch) => ch.userData.lining)) mesh.remove(c)
      }
      return
    }
    // A real lining reads thicker at the openings (so the contrast layer shows).
    const lined = !!l.data.lined
    const thickness = fabricThickness(l.fabric) * (lined ? 1.7 : 1)
    if (!l.lining) l.lining = this.makeLiningMaterial(thickness)
    const lm = l.lining
    if (lined) {
      // a satiny contrast lining fabric (complementary hue, lighter) shown inside
      const hsl = { h: 0, s: 0, l: 0 }
      new THREE.Color(l.fabric.color).getHSL(hsl)
      lm.color.setHSL((hsl.h + 0.5) % 1, Math.min(1, hsl.s + 0.12), Math.min(0.82, hsl.l + 0.22))
      lm.roughness = 0.26
      lm.sheen = 0.95
      lm.sheenRoughness = 0.34
      lm.sheenColor = new THREE.Color(0xffffff)
      lm.normalMap = null
    } else {
      lm.color.copy(l.material.color).multiplyScalar(0.8) // darker "inside" (plain thickness)
      lm.roughness = Math.min(1, l.material.roughness + 0.06)
      lm.sheen = l.material.sheen * 0.6
      lm.sheenRoughness = l.material.sheenRoughness
      lm.normalMap = l.material.normalMap
      lm.normalScale.copy(l.material.normalScale)
    }
    lm.needsUpdate = true
    ;(lm.userData.uThickness as { value: number }).value = thickness
    for (const { mesh } of l.controller.getPieces()) {
      if (mesh.children.some((c) => c.userData.lining)) continue
      const shell = new THREE.Mesh(mesh.geometry, lm)
      shell.userData.lining = true
      shell.castShadow = false
      shell.receiveShadow = true
      mesh.add(shell)
    }
  }

  rebuild(l: StackLayer): void {
    l.controller.build(l.data.garmentType, gradeParams(l.data))
    this.applyPartMaterials(l)
    this.buildDecor(l)
    this.updateLining(l)
    this.applyVisibility(l)
  }
  rebuildAll(): void {
    for (const l of this.layers) this.rebuild(l)
  }

  addLayer(data: GarmentLayerData, makeActive = true): StackLayer {
    const fabric: Fabric = { ...getFabric(data.fabricId), color: data.color }
    const material = createFabricMaterial(fabric)
    const controller = new GarmentController(
      this.scene,
      material,
      this.colliders,
      this.measurements,
      (name) => {
        const p = fabricToSolverParams(this.pieceFabric(layer, name))
        if (layer.data.boning && !/sleeve|leg/i.test(name)) return corsetParams(p) // rigid bodice only
        return layer.data.interfaced ? interfaceParams(p) : p
      },
      this.bodyCollider,
      this.anchors
    )
    const decor = new THREE.Group()
    this.scene.add(decor)
    const layer: StackLayer = {
      data,
      fabric,
      material,
      sleeveMaterial: createFabricMaterial(fabric),
      legMaterial: createFabricMaterial(fabric),
      backMaterial: createFabricMaterial(fabric),
      legBackMaterial: createFabricMaterial(fabric),
      trimMaterial: createFabricMaterial(fabric),
      lining: null,
      controller,
      design: null,
      sleeveDesign: null,
      legDesign: null,
      backDesign: null,
      legBackDesign: null,
      swatch: null,
      decor,
      prints: (data.prints ?? []).map(printFromSpec)
    }
    this.layers.push(layer)
    if (makeActive) this.activeIndex = this.layers.length - 1
    controller.setGravity(this.gravityY)
    controller.setWind(this.windX, this.windZ)
    this.rebuild(layer)
    this.applyLook(layer)
    return layer
  }

  select(i: number): void {
    this.activeIndex = Math.max(0, Math.min(this.layers.length - 1, i))
  }

  private disposeDecor(l: StackLayer): void {
    for (const c of l.decor.children) (c as THREE.Mesh).geometry?.dispose()
    l.decor.clear()
    this.scene.remove(l.decor)
  }

  removeActive(): void {
    if (this.layers.length <= 1) return // always keep at least one garment
    const [l] = this.layers.splice(this.activeIndex, 1)
    l.controller.clear()
    disposeMats(l)
    disposeDesigns(l)
    disposeSwatch(l.swatch)
    this.disposeDecor(l)
    this.activeIndex = Math.min(this.activeIndex, this.layers.length - 1)
  }

  toggleVisible(i: number): void {
    const l = this.layers[i]
    l.data.visible = !l.data.visible
    this.applyVisibility(l)
  }

  /** Hide every layer's meshes (entering Pattern mode); `rebuildAll` restores them. */
  hideAll(): void {
    for (const l of this.layers) {
      for (const m of l.controller.getMeshes()) m.visible = false
      l.decor.visible = false
    }
  }

  private readonly collision = new ClothCollision()
  step(dt: number): void {
    for (const l of this.layers) if (l.data.visible) l.controller.step(dt)
    // Global cloth self / inter collision over every visible garment (layered outfits
    // push off each other; a garment doesn't pass through itself).
    this.collision.resolve(this.layers.flatMap((l) => (l.data.visible ? l.controller.simPieces() : [])))
  }
  updateMeshes(): void {
    for (const l of this.layers) if (l.data.visible) l.controller.updateMeshes()
  }
  redrapeAll(): void {
    for (const l of this.layers) l.controller.redrape()
  }
  redrapeActive(): void {
    this.active.controller.redrape()
  }

  setGravity(y: number): void {
    this.gravityY = y
    for (const l of this.layers) l.controller.setGravity(y)
  }
  setWind(x: number, z: number): void {
    this.windX = x
    this.windZ = z
    for (const l of this.layers) l.controller.setWind(x, z)
  }
  setActivePhysics(): void {
    this.active.controller.setFabricPhysics()
  }
  setWireframe(on: boolean): void {
    for (const l of this.layers) for (const m of layerMats(l)) m.wireframe = on
  }
  get wireframe(): boolean {
    return this.layers.some((l) => l.material.wireframe)
  }

  getMeshesAll(): THREE.Object3D[] {
    return this.layers.flatMap((l) => l.controller.getMeshes())
  }

  /** Rows for the Object Browser (one per garment layer). */
  list(): LayerSummary[] {
    return this.layers.map((l, i) => ({
      name: getGarment(l.data.garmentType).name,
      color: l.data.color,
      visible: l.data.visible,
      active: i === this.activeIndex,
      pieces: l.controller.getPieces().length
    }))
  }

  clear(): void {
    for (const l of this.layers) {
      l.controller.clear()
      disposeMats(l)
      disposeDesigns(l)
      disposeSwatch(l.swatch)
      this.disposeDecor(l)
    }
    this.layers.length = 0
    this.activeIndex = 0
  }

  toData(): GarmentLayerData[] {
    return this.layers.map((l) => ({ ...l.data }))
  }
}
