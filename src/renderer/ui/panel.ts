import * as THREE from 'three'
import type { Loop } from '../core/Loop'
import type { Viewport } from '../core/Viewport'
import type { GarmentType } from '../garment/templates'
import type { NecklineStyle } from '../cloth/Garment'
import type { AnimationMode } from '../avatar/Mannequin'
import type { Fabric } from '../fabric/FabricLibrary'
import { button, colorField, el, section, slider, toggle, type Refreshable } from './controls'
import { patternSchematic } from './patternSchematic'

export interface GarmentState {
  type: GarmentType
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
}

export type DesignMode = 'templates' | 'pattern'
export type ExportFormat = 'glb' | 'obj' | 'svg' | 'dxf' | 'techpack' | 'json'

export interface PanelOptions {
  loop: Loop
  viewport: Viewport
  material: THREE.MeshPhysicalMaterial
  mannequin: THREE.Object3D
  fabrics: Fabric[]
  current: Fabric
  garment: GarmentState
  garmentTypes: GarmentType[]
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
  bodySize: { height: number; build: number }
  onBodySize: (b: { height: number; build: number }) => void
  onBodyMode: (realistic: boolean) => void
}

/** A friendly custom control panel: design mode, garment/pattern, fabric, physics. */
export function createControlPanel(opts: PanelOptions): HTMLElement {
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
  panel.append(header)

  // ---- actions ----
  const actions = el('div', 'dio-actions')
  let running = true
  const simBtn = button('❙❙  Pause', () => {}, true)
  simBtn.addEventListener('click', () => {
    running = !running
    opts.loop.setRunning(running)
    simBtn.textContent = running ? '❙❙  Pause' : '▶  Play'
    simBtn.classList.toggle('off', !running)
  })
  actions.append(simBtn, button('⤓  Re-drape', () => opts.onDrop()))
  panel.append(actions)

  // ---- design mode ----
  const modeRow = el('div', 'dio-actions')
  const modeBtns: Record<DesignMode, HTMLButtonElement> = {
    templates: button('Templates', () => switchMode('templates'), opts.mode === 'templates'),
    pattern: button('Pattern (sew)', () => switchMode('pattern'), opts.mode === 'pattern')
  }
  modeRow.append(modeBtns.templates, modeBtns.pattern)
  panel.append(modeRow)

  // ---- garment templates ----
  const garmentSec = section('Garment')
  const seg = el('div', 'dio-actions')
  const segBtns = new Map<GarmentType, HTMLButtonElement>()
  const label = (t: string): string => t[0].toUpperCase() + t.slice(1)
  for (const t of opts.garmentTypes) {
    const b = button(label(t), () => {
      garment.type = t
      for (const [gt, node] of segBtns) node.classList.toggle('primary', gt === t)
      opts.onGarmentEdit()
    }, t === garment.type)
    segBtns.set(t, b)
    seg.append(b)
  }
  seg.style.flexWrap = 'wrap'

  // neckline picker (applies to tops/dresses)
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
    const b = button(name, () => {
      garment.neckline = n
      for (const [nn, node] of neckBtns) node.classList.toggle('primary', nn === n)
      opts.onGarmentEdit()
    }, garment.neckline === n)
    neckBtns.set(n, b)
    neckRow.append(b)
  }

  garmentSec.body.append(
    seg,
    neckRow,
    slider({ label: 'Length', min: 0, max: 1, step: 0.01, get: () => garment.length, set: (v) => { garment.length = v; opts.onGarmentEdit() } }).row,
    slider({ label: 'Looseness', min: 0, max: 0.12, step: 0.005, format: (v) => `${(v * 100) | 0} cm`, get: () => garment.ease, set: (v) => { garment.ease = v; opts.onGarmentEdit() } }).row,
    slider({ label: 'Flare', min: 0, max: 0.22, step: 0.005, format: (v) => `${(v * 100) | 0} cm`, get: () => garment.flare, set: (v) => { garment.flare = v; opts.onGarmentEdit() } }).row
  )
  panel.append(garmentSec.root)

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
  panel.append(patternSec.root)

  function switchMode(m: DesignMode): void {
    opts.mode = m
    modeBtns.templates.classList.toggle('primary', m === 'templates')
    modeBtns.pattern.classList.toggle('primary', m === 'pattern')
    garmentSec.root.classList.toggle('dio-hidden', m !== 'templates')
    patternSec.root.classList.toggle('dio-hidden', m !== 'pattern')
    opts.onSetMode(m)
  }
  switchMode(opts.mode)

  // ---- mannequin size ----
  const bodySec = section('Mannequin', true)
  let realisticBody = false
  bodySec.body.append(
    toggle({ label: 'Imported body (GLB)', get: () => realisticBody, set: (v) => { realisticBody = v; opts.onBodyMode(v) } }).row,
    slider({ label: 'Height', min: 0.85, max: 1.15, step: 0.01, format: (v) => `${Math.round(v * 175)} cm`, get: () => opts.bodySize.height, set: (v) => { opts.bodySize.height = v; opts.onBodySize(opts.bodySize) } }).row,
    slider({ label: 'Build', min: 0.8, max: 1.25, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => opts.bodySize.build, set: (v) => { opts.bodySize.build = v; opts.onBodySize(opts.bodySize) } }).row
  )
  panel.append(bodySec.root)

  // ---- fabric gallery ----
  const fabricSec = section('Fabric')
  const gallery = el('div', 'dio-swatches')
  const swatchEls = new Map<string, HTMLElement>()
  const selectSwatch = (id: string): void => {
    for (const [fid, node] of swatchEls) node.classList.toggle('selected', fid === id)
  }
  for (const f of opts.fabrics) {
    const card = el('div', 'dio-swatch')
    const chip = el('div', 'dio-swatch-chip')
    chip.style.background = '#' + f.color.toString(16).padStart(6, '0')
    card.append(chip, el('div', 'dio-swatch-name', f.name))
    card.title = `${f.name} · ${f.gsm} gsm`
    card.addEventListener('click', () => {
      opts.onSelectFabric(f.id)
      selectSwatch(f.id)
      refreshers.forEach((r) => r.refresh())
    })
    swatchEls.set(f.id, card)
    gallery.append(card)
  }
  selectSwatch(current.id)
  fabricSec.body.append(gallery)
  panel.append(fabricSec.root)

  // ---- appearance ----
  const look = section('Appearance')
  look.body.append(
    track(colorField({ label: 'Colour', get: () => current.color, set: (v) => opts.onColor(v) })),
    track(slider({ label: 'Roughness', min: 0, max: 1, step: 0.01, get: () => current.roughness, set: (v) => { current.roughness = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheen', min: 0, max: 1, step: 0.01, get: () => current.sheen, set: (v) => { current.sheen = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Weave density', min: 40, max: 400, step: 1, get: () => current.weaveScale, set: (v) => { current.weaveScale = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Weave depth', min: 0, max: 1.5, step: 0.01, get: () => current.normalStrength, set: (v) => { current.normalStrength = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheen streak', min: 0, max: 1, step: 0.01, get: () => current.anisotropy, set: (v) => { current.anisotropy = v; opts.onVisualEdit() } })),
    track(slider({ label: 'Sheerness', min: 0, max: 1, step: 0.01, get: () => current.transmission, set: (v) => { current.transmission = v; opts.onVisualEdit() } }))
  )
  panel.append(look.root)

  // ---- fabric physics ----
  const cloth = section('Fabric physics', true)
  cloth.body.append(
    track(slider({ label: 'Weight', min: 30, max: 500, step: 1, format: (v) => `${v | 0} gsm`, get: () => current.gsm, set: (v) => { current.gsm = v; opts.onPhysicsEdit() } })),
    track(slider({ label: 'Stretch', min: 0, max: 1, step: 0.01, get: () => current.stretch, set: (v) => { current.stretch = v; opts.onPhysicsEdit() } })),
    track(slider({ label: 'Drape (soft)', min: 0, max: 1, step: 0.01, get: () => current.bendiness, set: (v) => { current.bendiness = v; opts.onPhysicsEdit() } })),
    track(slider({ label: 'Grip', min: 0, max: 1, step: 0.01, get: () => current.friction, set: (v) => { current.friction = v; opts.onPhysicsEdit() } }))
  )
  panel.append(cloth.root)

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
  panel.append(env.root)

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
  panel.append(animSec.root)

  // ---- export ----
  const exportSec = section('Export', true)
  const exportGrid = el('div', 'dio-actions')
  exportGrid.style.flexWrap = 'wrap'
  const exp: [string, ExportFormat][] = [
    ['3D · glTF', 'glb'],
    ['3D · OBJ', 'obj'],
    ['Pattern · SVG', 'svg'],
    ['Pattern · DXF', 'dxf'],
    ['Tech-pack', 'techpack'],
    ['Data · JSON', 'json']
  ]
  for (const [name, fmt] of exp) {
    const b = button(name, () => opts.onExport(fmt))
    b.style.flex = '1 1 42%'
    exportGrid.append(b)
  }
  exportSec.body.append(exportGrid)
  panel.append(exportSec.root)

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
    toggle({ label: 'Wireframe', get: () => opts.material.wireframe, set: (v) => (opts.material.wireframe = v) }).row,
    toggle({ label: 'Show mannequin', get: () => opts.mannequin.visible, set: (v) => (opts.mannequin.visible = v) }).row
  )
  panel.append(view.root)

  document.body.append(panel)
  return panel
}
