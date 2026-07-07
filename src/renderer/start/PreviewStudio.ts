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
import { sizeEase } from '../studio/document'

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, darkness: { value: 0.62 }, offset: { value: 1.05 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; varying vec2 vUv;
    void main(){ vec4 t = texture2D(tDiffuse, vUv); vec2 uv = (vUv - 0.5) * offset; float v = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0); gl_FragColor = vec4(t.rgb * v, t.a); }`
}

/** Subtle holographic sheen: faint scanlines + a cool screen-edge glow. */
const HologramShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmt; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float scan = 1.0 - 0.035 * uAmt * (0.5 + 0.5 * sin(vUv.y * 850.0 - uTime * 3.0));
      vec2 d = vUv - 0.5;
      float edge = smoothstep(0.34, 0.72, length(d));
      vec3 glow = vec3(0.42, 0.5, 1.0) * edge * 0.09 * uAmt;
      gl_FragColor = vec4(c.rgb * scan + glow, c.a);
    }`
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
  private readonly holo: ShaderPass
  private readonly ring: THREE.Mesh
  private readonly colorLight: THREE.PointLight
  private readonly particles: THREE.Points
  private time = 0
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
  private spin = true
  private bodyQueued = false
  private pendingBody: DesignConfig | null = null

  constructor(
    private readonly container: HTMLElement,
    private readonly onFirstFrame?: () => void
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.95 // tamed so the matte body reads with form
    container.appendChild(this.renderer.domElement)

    this.env = setupEnvironment(this.scene, this.renderer)

    // Three-quarter hero framing: slightly low, angled, close enough to fill the
    // wide preview so the piece is the subject (not a small figure in dead space).
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100)
    this.camera.position.set(1.05, 1.02, 2.55)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.minDistance = 1.6
    this.controls.maxDistance = 5
    this.controls.target.set(0, 0.92, 0)
    // `?still=1` freezes the turntable at the initial ¾ angle for repeatable captures.
    const still = new URLSearchParams(location.search).get('still') === '1'
    this.controls.autoRotate = !this.reducedMotion && !still
    this.controls.autoRotateSpeed = 2.0 // ~1 rev / 26 s
    this.controls.update()

    this.scene.add(this.mannequin.group)

    // ---- holographic stage: a glowing pedestal ring, a colour-reactive wash light,
    // and faint drifting particles (all additive, so they read as light, not geometry) ----
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.011, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x8a7bff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    this.ring.rotation.x = Math.PI / 2
    this.ring.position.y = 0.014
    this.scene.add(this.ring)

    this.colorLight = new THREE.PointLight(0xffffff, 0, 4, 2)
    this.colorLight.position.set(0.7, 1.5, 1.4)
    this.scene.add(this.colorLight)

    const N = 90
    const pp = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      pp[i * 3] = (Math.random() - 0.5) * 3.2
      pp[i * 3 + 1] = Math.random() * 2.3
      pp[i * 3 + 2] = (Math.random() - 0.5) * 3.2
    }
    const pgeo = new THREE.BufferGeometry()
    pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3))
    this.particles = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0xaab0ff, size: 0.013, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.scene.add(this.particles)

    this.material = createFabricMaterial(this.current)
    this.ctl = new GarmentController(
      this.scene,
      this.material,
      this.mannequin.colliders,
      this.mannequin.measurements,
      () => fabricToSolverParams(this.current),
      this.mannequin.bodyCollider,
      // Pin garments to the body's torso/hip anchors (as the studio does) so loose,
      // heavy pieces (hoodie/coat) hang from the shoulders + waist instead of sagging
      // forward off the body while they settle.
      () => this.mannequin.anchors()
    )
    // The preview never runs the per-frame mannequin.update() that fits the capsules to
    // the GLB rig, so use the **procedural body** — it keeps an accurate mesh-BVH collider,
    // so garments render cleanly on it instead of the real body punching through the crude
    // capsules of an un-fitted GLB.
    this.mannequin.setOnBodyChange(() => this.ctl.redrape())
    this.mannequin.setBodyMode(false)

    // ---- post-processing (studio-proven chain; grounding comes from the
    // reflective floor + shadow-catcher in setupEnvironment) ----
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.55, 1.85) // ~default; only true speculars bloom (no haze)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new ShaderPass(VignetteShader))
    this.holo = new ShaderPass(HologramShader)
    this.holo.uniforms.uAmt.value = this.reducedMotion ? 0.4 : 1 // calmer when reduced-motion
    this.composer.addPass(this.holo)
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
        // living stage: breathe the pedestal ring, drift the particles, animate the sheen
        if (!this.reducedMotion) {
          this.time += 1 / 60
          this.holo.uniforms.uTime.value = this.time
          const rm = this.ring.material as THREE.MeshBasicMaterial
          rm.opacity = 0.32 + 0.14 * Math.sin(this.time * 1.6)
          this.ring.scale.setScalar(1 + 0.015 * Math.sin(this.time * 1.6))
          this.particles.rotation.y = this.time * 0.05
          this.particles.position.y = 0.05 * Math.sin(this.time * 0.4)
        }
        this.composer.render()
        if (this.firstFrame) {
          this.firstFrame = false
          this.onFirstFrame?.()
        }
      }
    )
    this.loop.start()
  }

  /** Fit params with the size grade folded into the girth (mirrors the studio). */
  private graded(config: DesignConfig): { length: number; ease: number; flare: number; neckline: DesignConfig['neckline']; sleeve: DesignConfig['sleeve'] } {
    return {
      length: config.length,
      ease: Math.max(0, config.ease + sizeEase(config.size)),
      flare: config.flare,
      neckline: config.neckline,
      sleeve: config.sleeve
    }
  }

  /** Rebuild the garment shape (type / fit / size changed), then apply the look. */
  rebuild(config: DesignConfig): void {
    this.applyLook(config)
    this.ctl.build(config.garmentType, this.graded(config))
  }

  /** Turntable on/off (the preview's "spin / still" toggle). */
  setAutoRotate(on: boolean): void {
    this.spin = on && !this.reducedMotion
    this.controls.autoRotate = this.spin
  }

  /**
   * Resize the mannequin (height/build), then refit the garment. Coalesced to one
   * rebuild per frame so dragging the slider doesn't stack RES-90 body + BVH builds.
   */
  setBody(config: DesignConfig): void {
    this.pendingBody = config
    if (this.bodyQueued) return
    this.bodyQueued = true
    requestAnimationFrame(() => {
      this.bodyQueued = false
      const c = this.pendingBody!
      this.mannequin.resize({
        bodyType: c.bodyType,
        height: c.bodyHeight,
        build: c.bodyBuild,
        bust: c.bodyBust,
        waist: c.bodyWaist,
        hips: c.bodyHips
      })
      this.ctl.build(c.garmentType, this.graded(c))
    })
  }

  /** Update material only (colour / fabric / graphic / text). */
  applyLook(config: DesignConfig): void {
    Object.assign(this.current, getFabric(config.fabricId))
    this.current.color = config.color
    applyFabric(this.material, this.current)
    // wash the piece + pedestal ring in the chosen colour (dopamine: it glows your colour)
    this.colorLight.color.setHex(config.color)
    this.colorLight.intensity = 3.2
    ;(this.ring.material as THREE.MeshBasicMaterial).color.setHex(config.color).lerp(new THREE.Color(0x9a8cff), 0.4)
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
    if (this.reducedMotion || !this.spin) return
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
    this.ring.geometry.dispose()
    ;(this.ring.material as THREE.Material).dispose()
    this.particles.geometry.dispose()
    ;(this.particles.material as THREE.Material).dispose()
    this.env.dispose()
    this.renderer.dispose()
    dom.remove()
  }
}
