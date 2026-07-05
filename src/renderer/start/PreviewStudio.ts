import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Loop } from '../core/Loop'
import { setupEnvironment } from '../core/Environment'
import { buildMannequin } from '../avatar/Mannequin'
import { GarmentController } from '../garment/GarmentController'
import { createFabricMaterial, applyFabric } from '../cloth/FabricMaterial'
import { getFabric, fabricToSolverParams, type Fabric } from '../fabric/FabricLibrary'
import { buildDesignArt, hasArt, type DesignArt, type DesignConfig } from './design'

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, darkness: { value: 0.5 }, offset: { value: 1.1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; varying vec2 vUv;
    void main(){ vec4 t = texture2D(tDiffuse, vUv); vec2 uv = (vUv - 0.5) * offset; float v = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0); gl_FragColor = vec4(t.rgb * v, t.a); }`
}

/**
 * A compact live 3D preview of the piece you're designing — a **photographic
 * studio render** (reuses the studio environment: IBL, rim rig, reflective floor,
 * grounded contact shadow, plus AO / bloom / SMAA / vignette). The garment is
 * simulated and draped on the mannequin, on an eased auto-rotate turntable.
 */
export class PreviewStudio {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly material: THREE.MeshPhysicalMaterial
  private readonly ctl: GarmentController
  private readonly loop: Loop
  private readonly env: { dispose: () => void }
  private readonly mannequin = buildMannequin()
  private current: Fabric = { ...getFabric('cotton-poplin') }
  private design: DesignArt | null = null

  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private paused = false
  private firstFrame = true
  private resumeTimer = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly onFirstFrame?: () => void
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)

    this.env = setupEnvironment(this.scene, this.renderer)

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100)
    this.camera.position.set(0, 1.12, 3.2)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = 1.6
    this.controls.maxDistance = 5
    this.controls.target.set(0, 1.0, 0)
    this.controls.autoRotate = !this.reducedMotion
    this.controls.autoRotateSpeed = 2.2 // ~1 rev / 24 s
    this.controls.update()

    this.scene.add(this.mannequin.group)
    this.material = createFabricMaterial(this.current)
    this.ctl = new GarmentController(
      this.scene,
      this.material,
      this.mannequin.colliders,
      this.mannequin.measurements,
      () => fabricToSolverParams(this.current),
      this.mannequin.bodyCollider
    )

    // ---- post-processing (studio-proven chain; grounding comes from the
    // reflective floor + shadow-catcher in setupEnvironment) ----
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.5, 1.9)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new ShaderPass(VignetteShader))
    this.composer.addPass(new OutputPass())
    this.composer.addPass(new SMAAPass())

    // pause auto-rotate on interaction; pause the whole loop when hidden
    const dom = this.renderer.domElement
    dom.addEventListener('pointerenter', this.holdRotate)
    dom.addEventListener('pointerdown', this.holdRotate)
    dom.addEventListener('pointerleave', this.releaseRotate)
    dom.addEventListener('pointerup', this.releaseRotate)
    window.addEventListener('blur', this.onHide)
    window.addEventListener('focus', this.onShow)
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('resize', this.onResize)
    this.onResize()

    this.loop = new Loop(
      (dt) => this.ctl.step(dt),
      () => {
        if (this.paused) return
        this.ctl.updateMeshes()
        this.controls.update()
        this.composer.render()
        if (this.firstFrame) {
          this.firstFrame = false
          this.onFirstFrame?.()
        }
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

  private holdRotate = (): void => {
    window.clearTimeout(this.resumeTimer)
    this.controls.autoRotate = false
  }
  private releaseRotate = (): void => {
    if (this.reducedMotion) return
    window.clearTimeout(this.resumeTimer)
    this.resumeTimer = window.setTimeout(() => (this.controls.autoRotate = true), 1500)
  }
  private onHide = (): void => {
    this.paused = true
  }
  private onShow = (): void => {
    this.paused = false
    this.loop.setRunning(true)
  }
  private onVisibility = (): void => {
    this.paused = document.hidden
    if (!document.hidden) this.loop.setRunning(true)
  }

  private onResize = (): void => {
    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
    this.bloom.setSize(w, h)
  }

  dispose(): void {
    this.loop.stop()
    window.clearTimeout(this.resumeTimer)
    const dom = this.renderer.domElement
    dom.removeEventListener('pointerenter', this.holdRotate)
    dom.removeEventListener('pointerdown', this.holdRotate)
    dom.removeEventListener('pointerleave', this.releaseRotate)
    dom.removeEventListener('pointerup', this.releaseRotate)
    window.removeEventListener('blur', this.onHide)
    window.removeEventListener('focus', this.onShow)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('resize', this.onResize)
    this.env.dispose()
    this.renderer.dispose()
    dom.remove()
  }
}
