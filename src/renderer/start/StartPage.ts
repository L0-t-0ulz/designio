import { animate, stagger } from 'motion'
import { createElement, ArrowRight, Upload } from 'lucide'
import type { BodyType } from '../avatar/Mannequin'
import { FABRIC_FAMILIES, type Fabric } from '../fabric/FabricLibrary'
import { GARMENT_CATEGORIES, garmentsByCategory, getGarment } from '../garments/registry'
import { GARMENT_SIL, fabricSwatchCanvas } from '../ui/thumbnails'
import { el } from '../ui/controls'
import { defaultConfig, type DesignConfig } from './design'
import { PreviewStudio } from './PreviewStudio'

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A satisfying springy overshoot "pop" on select (cleared so CSS hover resumes). */
function pop(node: HTMLElement): void {
  if (reduced) return
  animate(node, { scale: [0.96, 1.05, 1] }, { duration: 0.34, ease: [0.34, 1.56, 0.64, 1] })
  window.setTimeout(() => (node.style.transform = ''), 380)
}

interface SliderOpts {
  label: string
  min: number
  max: number
  step: number
  get: () => number
  set: (v: number) => void
  format?: (v: number) => string
  /** Receives the slider's sync fn, so external state changes can refresh it. */
  ref?: (sync: () => void) => void
}

/** Homepage slider: accent-filled track + a value bubble while dragging. */
function startSlider(o: SliderOpts): HTMLElement {
  const fmt = o.format ?? ((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2)))
  const row = el('div', 'dio-row')
  const lab = el('label', undefined, o.label)
  const val = el('span', 'dio-val')
  const wrap = el('div')
  wrap.style.cssText = 'grid-column:1/-1;position:relative'
  const input = el('input')
  input.type = 'range'
  input.min = String(o.min)
  input.max = String(o.max)
  input.step = String(o.step)
  input.setAttribute('aria-label', o.label)
  const bubble = el('div', 'dio-bubble')
  wrap.append(input, bubble)

  const sync = (): void => {
    const v = o.get()
    input.value = String(v)
    const pct = (v - o.min) / (o.max - o.min)
    input.style.setProperty('--fill', pct * 100 + '%')
    val.textContent = fmt(v)
    bubble.textContent = fmt(v)
    bubble.style.left = `calc(${pct * 100}% )`
  }
  input.addEventListener('input', () => {
    o.set(parseFloat(input.value))
    sync()
  })
  input.addEventListener('pointerdown', () => bubble.classList.add('show'))
  input.addEventListener('focus', () => bubble.classList.add('show'))
  const hide = (): void => bubble.classList.remove('show')
  input.addEventListener('pointerup', hide)
  input.addEventListener('blur', hide)
  row.append(lab, val, wrap)
  o.ref?.(sync)
  sync()
  return row
}

const RECENTS: number[] = [0xc85a54, 0x3b5b82, 0x1a1a22, 0xd9c27e, 0x5f8f6b]

/** Colour swatch button that opens a small popover (native picker + recents). */
function startColor(labelText: string, get: () => number, set: (hex: number) => void): HTMLElement {
  const row = el('div', 'dio-row')
  row.append(el('label', undefined, labelText))
  const btn = el('button', 'dio-color-btn')
  btn.type = 'button'
  btn.setAttribute('aria-label', labelText)
  const paint = (): void => {
    btn.style.background = hex(get())
  }
  paint()

  let pop: HTMLElement | null = null
  const close = (): void => {
    pop?.remove()
    pop = null
    document.removeEventListener('pointerdown', onDoc)
  }
  const onDoc = (e: PointerEvent): void => {
    if (pop && !pop.contains(e.target as Node) && e.target !== btn) close()
  }
  btn.addEventListener('click', () => {
    if (pop) return close()
    pop = el('div', 'dio-popover')
    const picker = el('input') as HTMLInputElement
    picker.type = 'color'
    picker.value = hex(get())
    picker.style.cssText = 'width:100%;height:36px;border:none;background:none;cursor:pointer'
    picker.addEventListener('input', () => {
      set(parseInt(picker.value.slice(1), 16))
      paint()
    })
    const recents = el('div', 'dio-popover-recents')
    for (const c of RECENTS) {
      const s = el('span')
      s.style.background = hex(c)
      s.addEventListener('click', () => {
        set(c)
        picker.value = hex(c)
        paint()
      })
      recents.append(s)
    }
    pop.append(picker, recents)
    const r = btn.getBoundingClientRect()
    pop.style.top = r.bottom + 6 + 'px'
    pop.style.left = Math.min(r.left, window.innerWidth - 180) + 'px'
    document.body.append(pop)
    if (!reduced) animate(pop, { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.16 })
    setTimeout(() => document.addEventListener('pointerdown', onDoc), 0)
  })
  row.append(btn)
  return row
}

/**
 * The "design your piece" start page: pick a garment, colour it, add your own
 * graphic + text, set the fit — with a live 3D preview. Opens the full studio.
 */
export function showStartPage(
  fabrics: Fabric[],
  onStart: (config: DesignConfig) => void,
  initial?: DesignConfig,
  onHome?: () => void
): void {
  const config = initial ? { ...initial } : defaultConfig()
  let preview: PreviewStudio | null = null

  const overlay = el('div', 'dio-start')
  const header = el('div', 'dio-start-header dio-start-anim')
  header.append(el('div', 'dio-logo'))
  const title = el('div')
  title.append(el('div', 'dio-title', 'DesignIO'), el('div', 'dio-subtitle', 'Design your piece'))
  header.append(title)
  if (onHome) {
    const home = el('button', 'dio-back')
    home.type = 'button'
    home.style.marginLeft = 'auto'
    home.append(document.createTextNode('← Home'))
    home.addEventListener('click', () => {
      preview?.dispose()
      overlay.remove()
      onHome()
    })
    header.append(home)
  }
  overlay.append(header)

  const body = el('div', 'dio-start-body')

  // ---- garment gallery (grouped by category; roving tabindex + arrow keys) ----
  const fitSyncs: (() => void)[] = []
  const gallery = el('div', 'dio-start-gallery dio-start-anim')
  gallery.setAttribute('role', 'radiogroup')
  gallery.setAttribute('aria-label', 'Garment')
  const cards = new Map<string, HTMLElement>()
  const order: string[] = []
  const selectGarment = (id: string, focus = false, applyDefaults = true): void => {
    config.garmentType = id
    if (applyDefaults) Object.assign(config, getGarment(id).defaults) // starting fit/style
    for (const [gid, node] of cards) {
      const on = gid === id
      node.classList.toggle('selected', on)
      node.setAttribute('aria-checked', String(on))
      node.tabIndex = on ? 0 : -1
      if (on && focus) node.focus()
    }
    pop(cards.get(id)!)
    fitSyncs.forEach((s) => s()) // reflect the new length/ease/flare on the sliders
    preview?.rebuild(config)
  }
  for (const cat of GARMENT_CATEGORIES) {
    const items = garmentsByCategory(cat.id)
    if (!items.length) continue
    gallery.append(el('div', 'dio-fam-label', cat.label))
    const grid = el('div', 'dio-cards')
    for (const def of items) {
      const card = el('div', 'dio-start-card')
      card.setAttribute('role', 'radio')
      card.innerHTML = `<svg viewBox="0 0 200 300"><path d="${GARMENT_SIL[def.icon ?? 'top']}"/></svg>`
      card.append(el('div', 'dio-start-card-name', def.name))
      order.push(def.id)
      const nav = (dir: number): void => {
        const i = (order.indexOf(def.id) + dir + order.length) % order.length
        selectGarment(order[i], true)
      }
      card.addEventListener('click', () => selectGarment(def.id))
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          selectGarment(def.id)
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          nav(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          nav(-1)
        }
      })
      cards.set(def.id, card)
      grid.append(card)
    }
    gallery.append(grid)
  }
  body.append(gallery)

  // ---- live 3D preview ----
  const previewWrap = el('div', 'dio-start-preview dio-start-anim')
  const canvasHost = el('div', 'dio-start-canvas loading')
  previewWrap.append(canvasHost, el('div', 'dio-start-preview-note', 'Live 3D preview — drag to spin your piece'))
  body.append(previewWrap)

  // ---- controls ----
  const controls = el('div', 'dio-start-controls dio-start-anim')

  // fabric swatches, grouped by family
  const swatches = el('div')
  const swatchEls = new Map<string, HTMLElement>()
  const buildSwatch = (f: Fabric): HTMLElement => {
    const sw = el('div', 'dio-start-swatch')
    sw.setAttribute('role', 'button')
    sw.tabIndex = 0
    sw.setAttribute('aria-label', `${f.name}, ${f.gsm} gsm`)
    sw.append(fabricSwatchCanvas(f), el('div', 'dio-start-swatch-name', f.name))
    const pick = (): void => {
      config.fabricId = f.id
      for (const [id, n] of swatchEls) n.classList.toggle('selected', id === f.id)
      pop(sw)
      preview?.applyLook(config)
    }
    sw.addEventListener('click', pick)
    sw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        pick()
      }
    })
    swatchEls.set(f.id, sw)
    return sw
  }
  for (const fam of FABRIC_FAMILIES) {
    const group = fabrics.filter((f) => f.family === fam.id)
    if (!group.length) continue
    swatches.append(el('div', 'dio-fam-label', fam.label))
    const grid = el('div', 'dio-start-swatches')
    for (const f of group) grid.append(buildSwatch(f))
    swatches.append(grid)
  }
  swatchEls.get(config.fabricId)?.classList.add('selected')

  // upload drop-zone
  const drop = el('div', 'dio-start-drop')
  drop.tabIndex = 0
  drop.setAttribute('role', 'button')
  drop.setAttribute('aria-label', 'Upload your graphic')
  const resetDrop = (): void => {
    drop.replaceChildren(createElement(Upload), document.createTextNode('  Upload your graphic'))
  }
  resetDrop()
  const fileInput = el('input') as HTMLInputElement
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.style.display = 'none'
  const loadImage = (file: File): void => {
    if (!file.type.startsWith('image/') || file.size > 8_000_000) return
    const img = new Image()
    img.onload = () => {
      config.image = img
      const thumb = el('div', 'dio-start-drop-preview')
      const im = el('img') as HTMLImageElement
      im.src = img.src
      const rm = el('span', 'dio-start-drop-remove', 'remove')
      rm.addEventListener('click', (e) => {
        e.stopPropagation()
        config.image = null
        resetDrop()
        preview?.applyLook(config)
      })
      thumb.append(im, el('span', undefined, file.name.slice(0, 16)), rm)
      drop.replaceChildren(thumb)
      preview?.applyLook(config)
    }
    img.src = URL.createObjectURL(file)
  }
  drop.addEventListener('click', () => fileInput.click())
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click()
  })
  drop.addEventListener('dragover', (e) => {
    e.preventDefault()
    drop.classList.add('dragover')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'))
  drop.addEventListener('drop', (e) => {
    e.preventDefault()
    drop.classList.remove('dragover')
    const f = e.dataTransfer?.files?.[0]
    if (f) loadImage(f)
  })
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0]
    if (f) loadImage(f)
  })

  // Female / Male figure segmented toggle.
  function figureToggle(): HTMLElement {
    const row = el('div', 'dio-seg')
    const make = (t: BodyType, text: string): HTMLElement => {
      const b = el('button', 'dio-seg-btn', text)
      b.setAttribute('type', 'button')
      b.classList.toggle('on', config.bodyType === t)
      b.addEventListener('click', () => {
        config.bodyType = t
        row.querySelectorAll('.dio-seg-btn').forEach((n) => n.classList.remove('on'))
        b.classList.add('on')
        pop(b)
        preview?.setBody(config)
      })
      return b
    }
    row.append(make('female', 'Female'), make('male', 'Male'))
    return row
  }

  const textRow = el('div', 'dio-row')
  textRow.append(el('label', undefined, 'Text'))
  const textInput = el('input', 'dio-input') as HTMLInputElement
  textInput.type = 'text'
  textInput.placeholder = 'Add a slogan…'
  textInput.maxLength = 24
  textInput.value = config.text
  textInput.setAttribute('aria-label', 'Text on garment')
  textInput.addEventListener('input', () => {
    config.text = textInput.value
    preview?.applyLook(config)
  })
  textRow.append(textInput)

  controls.append(
    el('div', 'dio-start-section', 'Colour & fabric'),
    startColor('Base colour', () => config.color, (v) => { config.color = v; preview?.applyLook(config) }),
    swatches,
    el('div', 'dio-start-section', 'Your design'),
    drop,
    fileInput,
    startSlider({ label: 'Graphic size', min: 0.15, max: 0.8, step: 0.01, get: () => config.imageScale, set: (v) => { config.imageScale = v; preview?.applyLook(config) } }),
    textRow,
    startColor('Text colour', () => config.textColor, (v) => { config.textColor = v; preview?.applyLook(config) }),
    el('div', 'dio-start-section', 'Mannequin'),
    figureToggle(),
    startSlider({ label: 'Height', min: 0.9, max: 1.12, step: 0.005, format: (v) => `${Math.round(v * 170)} cm`, get: () => config.bodyHeight, set: (v) => { config.bodyHeight = v; preview?.setBody(config) } }),
    startSlider({ label: 'Build', min: 0.8, max: 1.35, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => config.bodyBuild, set: (v) => { config.bodyBuild = v; preview?.setBody(config) } }),
    startSlider({ label: 'Bust', min: 0.82, max: 1.25, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => config.bodyBust, set: (v) => { config.bodyBust = v; preview?.setBody(config) } }),
    startSlider({ label: 'Waist', min: 0.78, max: 1.3, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => config.bodyWaist, set: (v) => { config.bodyWaist = v; preview?.setBody(config) } }),
    startSlider({ label: 'Hips', min: 0.82, max: 1.3, step: 0.01, format: (v) => `${Math.round(v * 100)}%`, get: () => config.bodyHips, set: (v) => { config.bodyHips = v; preview?.setBody(config) } }),
    el('div', 'dio-start-section', 'Fit'),
    startSlider({ label: 'Length', min: 0, max: 1, step: 0.01, ref: (s) => fitSyncs.push(s), get: () => config.length, set: (v) => { config.length = v; preview?.rebuild(config) } }),
    startSlider({ label: 'Looseness', min: 0, max: 0.12, step: 0.005, format: (v) => `${(v * 100) | 0} cm`, ref: (s) => fitSyncs.push(s), get: () => config.ease, set: (v) => { config.ease = v; preview?.rebuild(config) } }),
    startSlider({ label: 'Flare', min: 0, max: 0.22, step: 0.005, format: (v) => `${(v * 100) | 0} cm`, ref: (s) => fitSyncs.push(s), get: () => config.flare, set: (v) => { config.flare = v; preview?.rebuild(config) } })
  )

  const go = el('button', 'dio-start-go')
  go.type = 'button'
  const arrow = el('span', 'dio-go-arrow')
  arrow.append(createElement(ArrowRight))
  go.append(document.createTextNode('Design in 3D  '), arrow)
  go.addEventListener('click', () => {
    preview?.dispose()
    overlay.remove()
    onStart(config)
  })
  controls.append(go)

  body.append(controls)
  overlay.append(body)
  document.body.append(overlay)

  // ---- create the live 3D preview + first garment ----
  selectGarment(config.garmentType, false, false)
  preview = new PreviewStudio(canvasHost, () => canvasHost.classList.remove('loading'))
  preview.rebuild(config)

  // ---- staggered load-in ----
  if (!reduced) {
    animate(
      '.dio-start-anim',
      { opacity: [0, 1], y: [12, 0] },
      { delay: stagger(0.06), duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    )
  } else {
    overlay.querySelectorAll('.dio-start-anim').forEach((n) => n.classList.remove('dio-start-anim'))
  }
}
