import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

/** Subtle vignette for a cinematic frame. */
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, darkness: { value: 0.65 }, offset: { value: 1.05 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float darkness; uniform float offset; varying vec2 vUv;
    void main(){ vec4 tex = texture2D(tDiffuse, vUv); vec2 uv = (vUv - 0.5) * offset; float v = clamp(1.0 - dot(uv, uv) * darkness, 0.0, 1.0); gl_FragColor = vec4(tex.rgb * v, tex.a); }`
}

/**
 * Owns the scene graph, camera, renderer, orbit controls and a post-processing
 * composer (subtle bloom + SMAA) for a premium look. Kept sized to the container.
 */
export class Viewport {
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  readonly controls: OrbitControls
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.95 // matches the homepage preview
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100)
    this.camera.position.set(1.7, 1.55, 2.7)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 0.6
    this.controls.maxDistance = 8
    this.controls.target.set(0, 1.0, 0)
    this.controls.update()

    // Post-processing. OutputPass reads tone mapping + exposure from the renderer
    // and applies them (plus sRGB) at the end, so the exposure control still works.
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // Barely-there: only strong speculars (silk/satin sheen) get a soft glow.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.5, 1.9)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new ShaderPass(VignetteShader))
    this.composer.addPass(new OutputPass())
    this.composer.addPass(new SMAAPass())

    window.addEventListener('resize', this.onResize)
    this.onResize()
  }

  /** Move the canvas into a new container (e.g. the shell's centre pane) + resize. */
  mount(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement)
    this.container = container
    this.onResize()
  }

  /** Re-fit to the current container (call after a splitter drag / panel collapse). */
  resize(): void {
    this.onResize()
  }

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
    this.bloom.setSize(w, h)
  }

  render(): void {
    this.controls.update()
    this.composer.render()
  }

  /**
   * Render a **high-resolution still** of the current view (WYSIWYG — same camera,
   * lighting and post-processing as the live viewport, just supersampled to `width`
   * for crisp anti-aliasing). Returns a PNG data URL, then restores the live size.
   */
  renderStill(width = 2048): string {
    const ratio = this.renderer.getPixelRatio()
    const W = Math.round(width)
    const H = Math.max(1, Math.round(width / this.camera.aspect))
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(W, H, false) // grow the backing buffer, leave the CSS size (no flash)
    this.composer.setSize(W, H)
    this.bloom.setSize(W, H)
    this.controls.update()
    this.composer.render()
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    out.getContext('2d')?.drawImage(this.renderer.domElement, 0, 0)
    const url = out.toDataURL('image/png')
    this.renderer.setPixelRatio(ratio)
    this.resize() // restore size + composer/bloom to the container
    this.render()
    return url
  }
}
