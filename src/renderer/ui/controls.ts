/** Tiny DOM helpers for building the control panel (no framework). */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

export interface Refreshable {
  row: HTMLElement
  refresh: () => void
}

export interface SliderOpts {
  label: string
  min: number
  max: number
  step: number
  get: () => number
  set: (v: number) => void
  format?: (v: number) => string
}

/** A labelled range slider with a live value readout. */
export function slider(o: SliderOpts): Refreshable {
  const row = el('div', 'dio-row')
  const label = el('label', undefined, o.label)
  const val = el('span', 'dio-val')
  const input = el('input')
  input.type = 'range'
  input.min = String(o.min)
  input.max = String(o.max)
  input.step = String(o.step)

  const fmt = o.format ?? ((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2)))
  const sync = (): void => {
    const v = o.get()
    input.value = String(v)
    val.textContent = fmt(v)
  }
  input.addEventListener('input', () => {
    o.set(parseFloat(input.value))
    val.textContent = fmt(parseFloat(input.value))
  })

  row.append(label, val, input)
  sync()
  return { row, refresh: sync }
}

export interface ToggleOpts {
  label: string
  get: () => boolean
  set: (v: boolean) => void
}

/** A labelled on/off switch. */
export function toggle(o: ToggleOpts): Refreshable {
  const row = el('div', 'dio-row')
  const label = el('label', undefined, o.label)
  const sw = el('div', 'dio-switch')
  const sync = (): void => {
    sw.classList.toggle('on', o.get())
  }
  sw.addEventListener('click', () => {
    o.set(!o.get())
    sync()
  })
  row.append(label, sw)
  sync()
  return { row, refresh: sync }
}

export interface ColorOpts {
  label: string
  get: () => number
  set: (hex: number) => void
}

const toHex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/** A labelled colour swatch input. */
export function colorField(o: ColorOpts): Refreshable {
  const row = el('div', 'dio-row')
  const label = el('label', undefined, o.label)
  const input = el('input', 'dio-color')
  input.type = 'color'
  const sync = (): void => {
    input.value = toHex(o.get())
  }
  input.addEventListener('input', () => o.set(parseInt(input.value.slice(1), 16)))
  row.append(label, input)
  sync()
  return { row, refresh: sync }
}

export interface TextOpts {
  label: string
  get: () => string
  set: (v: string) => void
  placeholder?: string
  maxLength?: number
}

/** A labelled single-line text input. */
export function textField(o: TextOpts): Refreshable {
  const row = el('div', 'dio-row')
  const label = el('label', undefined, o.label)
  const input = el('input', 'dio-text')
  input.type = 'text'
  if (o.placeholder) input.placeholder = o.placeholder
  if (o.maxLength) input.maxLength = o.maxLength
  const sync = (): void => {
    input.value = o.get()
  }
  input.addEventListener('input', () => o.set(input.value))
  row.append(label, input)
  sync()
  return { row, refresh: sync }
}

export function button(label: string, onClick: () => void, primary = false): HTMLButtonElement {
  const b = el('button', 'dio-btn' + (primary ? ' primary' : ''), label)
  b.addEventListener('click', onClick)
  return b
}

export interface Section {
  root: HTMLElement
  body: HTMLElement
}

/** A collapsible titled section. */
export function section(title: string, collapsed = false): Section {
  const root = el('div', 'dio-section' + (collapsed ? ' collapsed' : ''))
  const head = el('div', 'dio-section-head')
  head.append(el('span', undefined, title), el('span', 'dio-chevron', '▾'))
  const body = el('div', 'dio-section-body')
  head.addEventListener('click', () => root.classList.toggle('collapsed'))
  root.append(head, body)
  return { root, body }
}
