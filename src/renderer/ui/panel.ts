import GUI from 'lil-gui'
import * as THREE from 'three'
import type { Loop } from '../core/Loop'
import type { Viewport } from '../core/Viewport'
import type { XPBDSolver } from '../cloth/XPBDSolver'
import type { Fabric } from '../fabric/FabricLibrary'

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
 * Control panel: garment actions, a fabric library + live inspector (look and
 * physical drape properties), physics, and studio/view controls incl. a macro
 * close-up to inspect the weave.
 */
export function createControlPanel(opts: PanelOptions): GUI {
  const gui = new GUI({ title: 'DesignIO — Fabric Studio' })
  const { current, viewport } = opts

  // ---- garment actions ----
  gui.add({ simulate: true }, 'simulate').name('Simulate').onChange((v: boolean) => opts.loop.setRunning(v))
  gui.add({ drop: () => opts.onDrop() }, 'drop').name('⤓ Drape / Reset')

  // ---- fabric library ----
  const fabricOptions: Record<string, string> = {}
  for (const f of opts.fabrics) fabricOptions[f.name] = f.id
  const pick = { fabric: current.id }
  const colorState = { hex: '#' + new THREE.Color(current.color).getHexString() }

  gui
    .add(pick, 'fabric', fabricOptions)
    .name('Fabric')
    .onChange((id: string) => {
      opts.onSelectFabric(id)
      colorState.hex = '#' + new THREE.Color(current.color).getHexString()
      gui.controllersRecursive().forEach((c) => c.updateDisplay())
    })

  // ---- look (updates the material live) ----
  const look = gui.addFolder('Look')
  look.addColor(colorState, 'hex').name('Colour').onChange((v: string) => {
    current.color = new THREE.Color(v).getHex()
    opts.onVisualEdit()
  })
  look.add(current, 'roughness', 0, 1, 0.01).name('Roughness').onChange(opts.onVisualEdit)
  look.add(current, 'sheen', 0, 1, 0.01).name('Sheen').onChange(opts.onVisualEdit)
  look.add(current, 'weaveScale', 40, 400, 1).name('Weave density').onChange(opts.onVisualEdit)
  look.add(current, 'normalStrength', 0, 1.5, 0.01).name('Weave depth').onChange(opts.onVisualEdit)
  look.add(current, 'anisotropy', 0, 1, 0.01).name('Sheen streak').onChange(opts.onVisualEdit)
  look.add(current, 'transmission', 0, 1, 0.01).name('Sheerness').onChange(opts.onVisualEdit)

  // ---- physical properties (change the drape -> re-drape) ----
  const cloth = gui.addFolder('Fabric physics')
  cloth.add(current, 'gsm', 30, 500, 1).name('Weight (gsm)').onChange(opts.onPhysicsEdit)
  cloth.add(current, 'stretch', 0, 1, 0.01).name('Stretch').onChange(opts.onPhysicsEdit)
  cloth.add(current, 'bendiness', 0, 1, 0.01).name('Drape (soft)').onChange(opts.onPhysicsEdit)
  cloth.add(current, 'friction', 0, 1, 0.01).name('Grip').onChange(opts.onPhysicsEdit)

  // ---- environment forces ----
  const physics = gui.addFolder('Forces')
  physics.add({ g: 9.81 }, 'g', 0, 20, 0.1).name('Gravity').onChange((v: number) => opts.solver.gravity.set(0, -v, 0))
  physics.add(opts.solver.wind, 'x', -10, 10, 0.1).name('Wind X')
  physics.add(opts.solver.wind, 'z', -10, 10, 0.1).name('Wind Z')

  // ---- studio / view ----
  const studio = gui.addFolder('Studio')
  studio
    .add(viewport.renderer, 'toneMappingExposure', 0.4, 2, 0.01)
    .name('Exposure')
  studio.add(opts.material, 'wireframe').name('Wireframe')
  studio.add(opts.mannequin, 'visible').name('Show mannequin')

  const homePos = viewport.camera.position.clone()
  const homeTarget = viewport.controls.target.clone()
  studio.add({ closeup: false }, 'closeup').name('Macro close-up').onChange((v: boolean) => {
    if (v) {
      viewport.camera.position.set(0.12, 1.16, 0.62)
      viewport.controls.target.set(0, 1.08, 0.12)
    } else {
      viewport.camera.position.copy(homePos)
      viewport.controls.target.copy(homeTarget)
    }
    viewport.controls.update()
  })

  return gui
}
