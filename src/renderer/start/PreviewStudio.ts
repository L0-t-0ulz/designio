import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Loop } from '../core/Loop'
import { buildMannequin } from '../avatar/Mannequin'
import { GarmentController } from '../garment/GarmentController'
import { createFabricMaterial, applyFabric } from '../cloth/FabricMaterial'
import { getFabric, fabricToSolverParams, type Fabric } from '../fabric/FabricLibrary'
import { buildDesignArt, hasArt, type DesignArt, type DesignConfig } from './design'

/**
 * A compact live 3D preview of the piece you're designing: the garment simulated
 * and draped on the mannequin, on an auto-rotating turntable. Updates as the
 * design changes. This makes the design page genuine 3D/4D clothing, not a flat
 * mockup. Disposed when you enter the full studio.
 */
export class PreviewStudio {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly material: THREE.MeshPhysicalMaterial
  private readonly ctl: GarmentController
  private readonly loop: Loop
  private readonly mannequin = buildMannequin()
  private current: Fabric = { ...getFabric('cotton-poplin') }
  private design: DesignArt | null = null

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100)
    this.camera.position.set(0, 1.15, 3.2)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = 1.6
    this.controls.maxDistance = 5
    this.controls.target.set(0, 1.02, 0)
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 1.6
    this.controls.update()

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8890a0, 0.85)
    this.scene.add(hemi)
    const key = new THREE.DirectionalLight(0xfff6ec, 2.2)
    key.position.set(2.5, 5, 3.5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.0005
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0x9cc0ff, 0.5)
    rim.position.set(-3, 2, -3)
    this.scene.add(rim)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    this.scene.add(this.mannequin.group)

    this.material = createFabricMaterial(this.current)
    this.ctl = new GarmentController(
      this.scene,
      this.material,
      this.mannequin.colliders,
      this.mannequin.measurements,
      () => fabricToSolverParams(this.current)
    )

    window.addEventListener('resize', this.onResize)
    this.onResize()

    this.loop = new Loop(
      (dt) => this.ctl.step(dt),
      () => {
        this.ctl.updateMeshes()
        this.controls.update()
        this.renderer.render(this.scene, this.camera)
      }
    )
    this.loop.start()
  }

  /** Rebuild the garment shape (type / fit changed), then apply the look. */
  rebuild(config: DesignConfig): void {
    this.applyLook(config)
    this.ctl.build(config.garmentType, config)
  }

  /** Update material only (colour / fabric / graphic / text). */
  applyLook(config: DesignConfig): void {
    Object.assign(this.current, getFabric(config.fabricId))
    this.current.color = config.color
    applyFabric(this.material, this.current)
    if (hasArt(config)) {
      this.design = buildDesignArt(config)
      this.material.map = this.design.texture
      this.material.color.set(0xffffff)
    } else {
      this.material.map = null
      this.material.needsUpdate = true
    }
    this.ctl.setFabricPhysics()
  }

  private onResize = (): void => {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose(): void {
    this.loop.stop()
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
