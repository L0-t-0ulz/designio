import * as THREE from 'three'
import type { Loop } from '../core/Loop'
import type { Viewport } from '../core/Viewport'
import type { XPBDSolver } from '../cloth/XPBDSolver'
import type { Fabric } from '../fabric/FabricLibrary'
import { button, colorField, el, section, slider, toggle, type Refreshable } from './controls'

export interface PanelOptions {
  loop: Loop
  solver: XPBDSolver
  viewport: Viewport
  material: THREE.MeshPhysicalMaterial
  mannequin: THREE.Object3D
  fabrics: Fabric[]
  /** Stable working copy of the selected fabric; the inspector edits it in place. */
  current: Fabric
  onSelectFabric: (id: string) => void
  onVisualEdit: () => void
  onPhysicsEdit: () => void
  onDrop: () => void
}

/**
 * A friendly, custom control panel: a visual fabric gallery, clearly labelled
 * sliders with live values, big action buttons, and tidy collapsible sections.
 */
export function createControlPanel(opts: PanelOptions): HTMLElement {
  const { current, viewport } = opts
  const refreshers: Refreshable[] = []
  const track = (r: Refreshable): HTMLElement => {
    refreshers.push(r)
    return r.row
  }

  const panel = el('div', 'dio-panel')

  // ---- header ----
  const header = el('div', 'dio-header')
  const heading = el('div')
  heading.append(el('div', 'dio-title', 'DesignIO'), el('div', 'dio-subtitle', 'Fabric Studio'))
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
    track(colorField({ label: 'Colour', get: () => current.color, set: (v) => { current.color = v; opts.onVisualEdit() } })),
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
  env.body.append(
    slider({ label: 'Gravity', min: 0, max: 20, step: 0.1, get: () => gravity, set: (v) => { gravity = v; opts.solver.gravity.set(0, -v, 0) } }).row,
    slider({ label: 'Wind ←→', min: -10, max: 10, step: 0.1, get: () => opts.solver.wind.x, set: (v) => (opts.solver.wind.x = v) }).row,
    slider({ label: 'Wind ↕', min: -10, max: 10, step: 0.1, get: () => opts.solver.wind.z, set: (v) => (opts.solver.wind.z = v) }).row,
    slider({ label: 'Exposure', min: 0.4, max: 2, step: 0.01, get: () => viewport.renderer.toneMappingExposure, set: (v) => (viewport.renderer.toneMappingExposure = v) }).row
  )
  panel.append(env.root)

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
