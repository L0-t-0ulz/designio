import { GARMENT_TYPES, type GarmentType } from '../garment/templates'
import type { Fabric } from '../fabric/FabricLibrary'
import { button, colorField, el, slider } from '../ui/controls'
import { defaultConfig, type DesignConfig } from './design'
import { PreviewStudio } from './PreviewStudio'

// Small garment silhouettes for the gallery icons (viewBox 0 0 200 300).
const SIL: Record<GarmentType, string> = {
  dress: 'M65,42 Q100,26 135,42 L148,82 L120,120 L150,278 L50,278 L80,120 L52,82 Z',
  top: 'M60,46 Q100,30 140,46 L150,86 L124,112 L128,178 L72,178 L76,112 L50,86 Z',
  skirt: 'M70,86 L130,86 L156,278 L44,278 Z',
  pants: 'M70,72 L130,72 L127,150 L113,278 L92,278 L100,162 L88,278 L69,278 L73,150 Z'
}

const label = (t: string): string => t[0].toUpperCase() + t.slice(1)

/**
 * The "design your piece" start page: pick a garment, colour it, add your own
 * graphic + text, set the fit — with a **live 3D preview** of the garment draped
 * on the mannequin (auto-rotating). Then open it in the full 3D studio.
 */
export function showStartPage(fabrics: Fabric[], onStart: (config: DesignConfig) => void): void {
  const config = defaultConfig()

  const overlay = el('div', 'dio-start')
  const header = el('div', 'dio-start-header')
  header.append(el('div', 'dio-logo'))
  const title = el('div')
  title.append(el('div', 'dio-title', 'DesignIO'), el('div', 'dio-subtitle', 'Design your piece'))
  header.append(title)
  overlay.append(header)

  const body = el('div', 'dio-start-body')

  // ---- garment gallery ----
  const gallery = el('div', 'dio-start-gallery')
  const galleryCards = new Map<GarmentType, HTMLElement>()
  for (const t of GARMENT_TYPES) {
    const card = el('div', 'dio-start-card')
    card.innerHTML = `<svg viewBox="0 0 200 300"><path d="${SIL[t]}" fill="#c9cdd8" stroke="#0002"/></svg>`
    card.append(el('div', 'dio-start-card-name', label(t)))
    card.addEventListener('click', () => {
      config.garmentType = t
      for (const [gt, node] of galleryCards) node.classList.toggle('selected', gt === t)
      preview?.rebuild(config)
    })
    galleryCards.set(t, card)
    gallery.append(card)
  }
  body.append(gallery)

  // ---- live 3D preview ----
  const previewWrap = el('div', 'dio-start-preview')
  const canvasHost = el('div', 'dio-start-canvas')
  previewWrap.append(canvasHost, el('div', 'dio-start-preview-note', 'Live 3D preview — drag to spin your piece'))
  body.append(previewWrap)

  // ---- controls ----
  const controls = el('div', 'dio-start-controls')

  const fabricRow = el('div', 'dio-row')
  fabricRow.append(el('label', undefined, 'Fabric'))
  const fabricSel = el('select', 'dio-select') as HTMLSelectElement
  for (const f of fabrics) {
    const opt = document.createElement('option')
    opt.value = f.id
    opt.textContent = f.name
    fabricSel.append(opt)
  }
  fabricSel.value = config.fabricId
  fabricSel.addEventListener('change', () => {
    config.fabricId = fabricSel.value
    preview?.applyLook(config)
  })
  fabricRow.append(fabricSel)

  const uploadBtn = button('⬆  Upload your graphic', () => fileInput.click())
  uploadBtn.classList.add('dio-start-upload')
  const fileInput = el('input') as HTMLInputElement
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.style.display = 'none'
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      config.image = img
      uploadBtn.textContent = '✓  Graphic added — replace'
      preview?.applyLook(config)
    }
    img.src = URL.createObjectURL(file)
  })

  const textRow = el('div', 'dio-row')
  textRow.append(el('label', undefined, 'Text'))
  const textInput = el('input', 'dio-input') as HTMLInputElement
  textInput.type = 'text'
  textInput.placeholder = 'Add a slogan…'
  textInput.maxLength = 24
  textInput.addEventListener('input', () => {
    config.text = textInput.value
    preview?.applyLook(config)
  })
  textRow.append(textInput)

  controls.append(
    el('div', 'dio-start-section', 'Colour & fabric'),
    colorField({ label: 'Base colour', get: () => config.color, set: (v) => { config.color = v; preview?.applyLook(config) } }).row,
    fabricRow,
    el('div', 'dio-start-section', 'Your design'),
    uploadBtn,
    fileInput,
    slider({ label: 'Graphic size', min: 0.15, max: 0.8, step: 0.01, get: () => config.imageScale, set: (v) => { config.imageScale = v; preview?.applyLook(config) } }).row,
    textRow,
    colorField({ label: 'Text colour', get: () => config.textColor, set: (v) => { config.textColor = v; preview?.applyLook(config) } }).row,
    el('div', 'dio-start-section', 'Fit'),
    slider({ label: 'Length', min: 0, max: 1, step: 0.01, get: () => config.length, set: (v) => { config.length = v; preview?.rebuild(config) } }).row,
    slider({ label: 'Looseness', min: 0, max: 0.12, step: 0.005, format: (v) => `${(v * 100) | 0} cm`, get: () => config.ease, set: (v) => { config.ease = v; preview?.rebuild(config) } }).row,
    slider({ label: 'Flare', min: 0, max: 0.22, step: 0.005, format: (v) => `${(v * 100) | 0} cm`, get: () => config.flare, set: (v) => { config.flare = v; preview?.rebuild(config) } }).row
  )

  const go = button('Design in 3D  →', () => {
    preview?.dispose()
    overlay.remove()
    onStart(config)
  }, true)
  go.classList.add('dio-start-go')
  controls.append(go)

  body.append(controls)
  overlay.append(body)
  document.body.append(overlay)

  // Create the 3D preview once the host is laid out, and draw the first garment.
  let preview: PreviewStudio | null = null
  for (const [gt, node] of galleryCards) node.classList.toggle('selected', gt === config.garmentType)
  preview = new PreviewStudio(canvasHost)
  preview.rebuild(config)
}
