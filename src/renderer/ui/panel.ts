import GUI from 'lil-gui'
import * as THREE from 'three'
import type { Loop } from '../core/Loop'
import type { XPBDSolver } from '../cloth/XPBDSolver'
import { FABRICS, type FabricName } from '../cloth/fabricPresets'

export interface PanelOptions {
  loop: Loop
  solver: XPBDSolver
  material: THREE.MeshPhysicalMaterial
  mannequin: THREE.Object3D
  onFabricChange: (fabric: FabricName) => void
  onDrop: () => void
}

/**
 * The lil-gui control panel: simulate on/off, drop/reset, fabric preset,
 * gravity, wind, colour, and a few display toggles.
 */
export function createControlPanel(opts: PanelOptions): GUI {
  const gui = new GUI({ title: 'DesignIO — Fabric Lab' })

  const state = {
    simulate: true,
    fabric: 'cotton' as FabricName,
    gravity: 9.81,
    windX: 0,
    windZ: 0,
    color: '#' + new THREE.Color(FABRICS.cotton.color).getHexString(),
    wireframe: false,
    showBody: true
  }

  gui.add(state, 'simulate').name('Simulate').onChange((v: boolean) => opts.loop.setRunning(v))
  gui.add({ drop: () => opts.onDrop() }, 'drop').name('⤓ Drop / Reset')

  gui
    .add(state, 'fabric', Object.keys(FABRICS) as FabricName[])
    .name('Fabric')
    .onChange((f: FabricName) => {
      // onFabricChange owns the material colour + drape; here we only sync the
      // colour picker's displayed value to match the new preset.
      opts.onFabricChange(f)
      state.color = '#' + new THREE.Color(FABRICS[f].color).getHexString()
      gui.controllersRecursive().forEach((c) => c.updateDisplay())
    })

  const physics = gui.addFolder('Physics')
  physics
    .add(state, 'gravity', 0, 20, 0.1)
    .name('Gravity')
    .onChange((v: number) => opts.solver.gravity.set(0, -v, 0))
  physics.add(state, 'windX', -10, 10, 0.1).name('Wind X').onChange((v: number) => {
    opts.solver.wind.x = v
  })
  physics.add(state, 'windZ', -10, 10, 0.1).name('Wind Z').onChange((v: number) => {
    opts.solver.wind.z = v
  })

  const display = gui.addFolder('Display')
  display.addColor(state, 'color').name('Colour').onChange((v: string) => opts.material.color.set(v))
  display.add(state, 'wireframe').name('Wireframe').onChange((v: boolean) => {
    opts.material.wireframe = v
  })
  display.add(state, 'showBody').name('Show mannequin').onChange((v: boolean) => {
    opts.mannequin.visible = v
  })

  return gui
}
