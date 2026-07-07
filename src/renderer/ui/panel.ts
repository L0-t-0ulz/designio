import * as THREE from 'three'
import type { Loop } from '../core/Loop'
import type { Viewport } from '../core/Viewport'
import type { GarmentType, SleeveStyle, CollarStyle, SleeveShape } from '../garment/templates'
import { COLLAR_STYLES, SLEEVE_SHAPES } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { AnimationMode, BodyParams, BodyType } from '../avatar/Mannequin'
import type { Fabric } from '../fabric/FabricLibrary'
import { getGarment } from '../garments/registry'
import { button, colorField, el, section, slider, textField, toggle, type Refreshable } from './controls'
import { patternSchematic } from './patternSchematic'
import { SIZES, type SizeLabel } from '../studio/document'
import type { PartId } from '../studio/GarmentStack'
import type { GarmentMetrics } from '../export/garmentMetrics'

export interface GarmentState {
  type: GarmentType
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
  sleeve: SleeveStyle
  sleeveShape?: SleeveShape
  size: SizeLabel
  collar?: boolean
  collarStyle?: CollarStyle
  cuff?: boolean
  pleats?: boolean
  dart?: boolean
  pocket?: boolean
  hem?: boolean
  closure?: boolean
  seam?: number
  notches?: boolean
  trim?: boolean
}

export type DesignMode = 'templates' | 'pattern'
export type ExportFormat = 'glb' | 'obj' | 'svg' | 'dxf' | 'techpack' | 'json' | 'manufacture'

/** A placed print (logo/text) as shown in the Prints manager. */
export interface PrintItem {
  id: string
  kind: 'image' | 'text'
  label: string
}
export interface PrintPatch {
  x?: number
  y?: number
  scale?: number
  rotation?: number
  text?: string
  color?: number
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
  onSetGravity: (y: number) => void
  onSetWind: (x: number, z: number) => void
  onExport: (format: ExportFormat) => void
  anim: { mode: AnimationMode; speed: number }
  onSetAnimMode: (m: AnimationMode) => void
  onAnimSpeed: (v: number) => void
  onColor: (hex: number) => void
  /** Which garment part the colour/fabric edits target (Body/Sleeves/Legs/Trim). */
  onSelectPart?: (part: PartId) => void
  /** Add / adjust a printed graphic (PNG) + text on the garment (optional). */
  prints?: PrintControls
  /** Live measurements of the active garment (for the Measurements readout). */
  getMetrics?: () => GarmentMetrics
  bodySize: BodyParams
  onBodySize: (b: BodyParams) => void
  onBodyMode: (realistic: boolean) => void
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
  const easeS = slider({ label: 'Looseness', min: 0, max: 0.12, step: 0.005, fine: 0.001, format: (v) => `${(v * 100) | 0} cm`, get: () => garment.ease, set: (v) => { garment.ease = v; opts.onGarmentEdit() } })
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
    if (def.supports.sleeve) parts.push(['Sleeves', 'sleeves'])
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
    // the collar/lapel library shows only when the Collar detail is supported + on
    collarBlock.classList.toggle('dio-hidden', !def.supports.collar || !garment.collar)
    for (const [cstyle, node] of collarBtns) node.classList.toggle('primary', (garment.collarStyle ?? 'band') === cstyle)
    // the sleeve library shows only when the garment has sleeves selected
    sleeveShapeBlock.classList.toggle('dio-hidden', !def.supports.sleeve || garment.sleeve === 'none')
    for (const [sh, node] of sleeveShapeBtns) node.classList.toggle('primary', (garment.sleeveShape ?? 'set-in') === sh)
    syncNeckSleeve()
    lenS.refresh()
    easeS.refresh()
    flareS.refresh()
  }
  function selectGarment(id: string): void {
    garment.type = id
    Object.assign(garment, getGarment(id).defaults) // apply the garment's starting fit/style
    syncGarment()
    opts.onGarmentEdit()
  }

  // construction detail toggles (collar · cuff · pleats · darts), shown per garment
  const detailDefs: [string, 'collar' | 'cuff' | 'pleats' | 'dart' | 'pocket' | 'hem' | 'closure'][] = [
    ['Collar', 'collar'],
    ['Cuff', 'cuff'],
    ['Pleats', 'pleats'],
    ['Darts', 'dart'],
    ['Pocket', 'pocket'],
    ['Rolled hem', 'hem'],
    ['Closure', 'closure']
  ]
  const detailToggles = detailDefs.map(([label, key]) => ({
    key,
    t: toggle({ label, get: () => !!garment[key], set: (v) => { garment[key] = v; syncGarment(); opts.onGarmentEdit() } })
  }))
  const construction = section('Construction')
  construction.body.append(sizeBlock, neckRow, sleeveRow, sleeveShapeBlock, lenS.row, easeS.row, flareS.row, ...detailToggles.map((d) => d.t.row), collarBlock)
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
  bodySec.body.append(
    figRow,
    toggle({ label: 'Imported body (GLB)', get: () => realisticBody, set: (v) => { realisticBody = v; opts.onBodyMode(v) } }).row,
    slider({ label: 'Height', min: 0.85, max: 1.15, step: 0.01, format: (v) => `${Math.round(v * 175)} cm`, get: () => opts.bodySize.height, set: (v) => { opts.bodySize.height = v; opts.onBodySize(opts.bodySize) } }).row,
    slider({ label: 'Build', min: 0.8, max: 1.25, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => opts.bodySize.build, set: (v) => { opts.bodySize.build = v; opts.onBodySize(opts.bodySize) } }).row,
    slider({ label: 'Bust', min: 0.82, max: 1.25, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => opts.bodySize.bust, set: (v) => { opts.bodySize.bust = v; opts.onBodySize(opts.bodySize) } }).row,
    slider({ label: 'Waist', min: 0.78, max: 1.3, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => opts.bodySize.waist, set: (v) => { opts.bodySize.waist = v; opts.onBodySize(opts.bodySize) } }).row,
    slider({ label: 'Hips', min: 0.82, max: 1.3, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => opts.bodySize.hips, set: (v) => { opts.bodySize.hips = v; opts.onBodySize(opts.bodySize) } }).row
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
      img.onload = () => {
        selectedId = p.addImage(img, file.name.slice(0, 16))
        renderList()
        renderEditor()
      }
      img.src = URL.createObjectURL(file)
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
    track(colorField({ label: 'Colour', get: () => current.color, set: (v) => opts.onColor(v) })),
    track(slider({ label: 'Roughness', min: 0, max: 1, step: 0.01, get: () => current.roughness, set: (v) => { current.roughness = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheen', min: 0, max: 1, step: 0.01, get: () => current.sheen, set: (v) => { current.sheen = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Weave density', min: 40, max: 400, step: 1, get: () => current.weaveScale, set: (v) => { current.weaveScale = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Weave depth', min: 0, max: 1.5, step: 0.01, get: () => current.normalStrength, set: (v) => { current.normalStrength = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheen streak', min: 0, max: 1, step: 0.01, get: () => current.anisotropy, set: (v) => { current.anisotropy = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheerness', min: 0, max: 1, step: 0.01, get: () => current.transmission, set: (v) => { current.transmission = v; opts.onVisualEdit() } }))
  )
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
  env.body.append(
    slider({ label: 'Gravity', min: 0, max: 20, step: 0.1, get: () => gravity, set: (v) => { gravity = v; opts.onSetGravity(v) } }).row,
    slider({ label: 'Wind ←→', min: -10, max: 10, step: 0.1, get: () => windX, set: (v) => { windX = v; opts.onSetWind(windX, windZ) } }).row,
    slider({ label: 'Wind ↕', min: -10, max: 10, step: 0.1, get: () => windZ, set: (v) => { windZ = v; opts.onSetWind(windX, windZ) } }).row,
    slider({ label: 'Exposure', min: 0.4, max: 2, step: 0.01, get: () => viewport.renderer.toneMappingExposure, set: (v) => (viewport.renderer.toneMappingExposure = v) }).row
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
  animSec.body.append(
    animRow,
    slider({ label: 'Speed', min: 0.2, max: 3, step: 0.1, get: () => opts.anim.speed, set: (v) => { opts.anim.speed = v; opts.onAnimSpeed(v) } }).row
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

  // ---- context groups + tabs (Garment / Avatar / Scene) ----
  const garmentGroup = el('div')
  garmentGroup.append(modeRow, construction.root, patternSec.root, look.root, production.root, metricsSec.root, cloth.root)
  const avatarGroup = el('div', 'dio-hidden')
  avatarGroup.append(bodySec.root)
  const sceneGroup = el('div')
  sceneGroup.append(redrapeRow, env.root, animSec.root, view.root)

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
