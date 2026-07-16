import { vectorToSVG, DEMO_VECTOR, type VShape, type VShapeKind } from './vectorPrint'
import { saveFile } from '../export/save'

/**
 * The **in-app vector print editor** — a little modal to compose a print graphic from
 * shapes (no upload): add rect / circle / star / text, recolour, remove, watch the
 * live SVG preview, then download the SVG (import it as a print). The shape model +
 * SVG live in `./vectorPrint` (pure, tested). Open from File → Vector print editor or
 * `?vectorEditor=1`.
 */
let overlay: HTMLDivElement | null = null

export function vectorEditorOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeVectorEditor()
}

export function closeVectorEditor(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

const PALETTE = [0x1d4e89, 0xf0c674, 0xd94f6a, 0x16161a, 0x2e8b57, 0xffffff]

export function openVectorEditor(): void {
  if (overlay) return
  const shapes: VShape[] = DEMO_VECTOR.map((s) => ({ ...s })) // start from the sample
  let colorIdx = 0

  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Vector print editor')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeVectorEditor()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '520px' })

  const h = document.createElement('h2')
  h.textContent = 'Vector print editor'
  card.appendChild(h)

  const preview = document.createElement('div')
  Object.assign(preview.style, { width: '200px', height: '200px', margin: '4px auto 12px', background: 'repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 20px 20px', borderRadius: '8px', overflow: 'hidden' })
  card.appendChild(preview)

  const tools = document.createElement('div')
  tools.className = 'dio-actions'
  tools.style.flexWrap = 'wrap'
  const addBtn = (label: string, fn: () => void): void => {
    const b = document.createElement('button')
    b.className = 'dio-btn'
    b.textContent = label
    b.addEventListener('click', fn)
    tools.appendChild(b)
  }
  const nextColor = (): number => PALETTE[colorIdx++ % PALETTE.length]
  const spawn = (kind: VShapeKind): void => {
    const n = shapes.length
    shapes.push({ kind, x: 0.4 + ((n * 0.07) % 0.2), y: 0.4 + ((n * 0.05) % 0.2), w: kind === 'line' ? 0.5 : 0.3, h: kind === 'line' ? 3 : kind === 'text' ? 0.12 : 0.3, color: nextColor(), rotation: 0, text: kind === 'text' ? 'TEXT' : undefined })
    render()
  }
  addBtn('+ Rect', () => spawn('rect'))
  addBtn('+ Circle', () => spawn('circle'))
  addBtn('+ Star', () => spawn('star'))
  addBtn('+ Line', () => spawn('line'))
  addBtn('+ Text', () => spawn('text'))
  addBtn('Undo', () => {
    shapes.pop()
    render()
  })
  addBtn('Clear', () => {
    shapes.length = 0
    render()
  })
  card.appendChild(tools)

  const actions = document.createElement('div')
  actions.className = 'dio-actions'
  Object.assign(actions.style, { marginTop: '12px' })
  const dl = document.createElement('button')
  dl.className = 'dio-btn primary'
  dl.textContent = 'Download SVG'
  dl.addEventListener('click', () => {
    void saveFile('vector-print.svg', vectorToSVG(shapes, 512), [{ name: 'SVG', extensions: ['svg'] }])
  })
  actions.appendChild(dl)
  card.appendChild(actions)

  const render = (): void => {
    preview.innerHTML = shapes.length ? vectorToSVG(shapes, 200) : '<p style="text-align:center;opacity:.5;padding-top:80px">Empty — add a shape</p>'
  }
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
}
