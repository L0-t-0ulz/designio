import { el } from '../ui/controls'
import type { ExportFormat } from '../ui/panel'
import type { AnimationMode } from '../avatar/Mannequin'

export interface MenuActions {
  onNew: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onExport: (fmt: ExportFormat) => void
  onUndo: () => void
  onRedo: () => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAnim: (mode: AnimationMode) => void
  onToggleWireframe: () => void
  onToggleMannequin: () => void
  onToggleLibrary: () => void
  onTogglePanel: () => void
  onToggleSimple: () => void
  onResetLayout: () => void
  onAbout: () => void
}

interface Item {
  label?: string
  run?: () => void
  disabled?: boolean
  sep?: boolean
}

/** A professional top menu bar, wired to the studio's real actions. */
export function buildMenuBar(host: HTMLElement, a: MenuActions): void {
  host.replaceChildren()
  const brand = el('div', 'dio-menu-brand')
  brand.append(el('span', 'dio-menu-logo'), el('span', undefined, 'DesignIO'))
  host.append(brand)

  let open: HTMLElement | null = null
  const closeAll = (): void => {
    open?.classList.remove('open')
    open = null
    document.removeEventListener('pointerdown', onDoc)
  }
  const onDoc = (e: PointerEvent): void => {
    if (open && !open.contains(e.target as Node)) closeAll()
  }

  const menu = (label: string, items: Item[]): void => {
    const wrap = el('div', 'dio-menu')
    const btn = el('button', 'dio-menu-btn', label)
    const drop = el('div', 'dio-menu-drop')
    for (const it of items) {
      if (it.sep) {
        drop.append(el('div', 'dio-menu-sep'))
        continue
      }
      const mi = el('button', 'dio-menu-item' + (it.disabled ? ' disabled' : ''), it.label)
      if (!it.disabled) {
        mi.addEventListener('click', () => {
          closeAll()
          it.run?.()
        })
      }
      drop.append(mi)
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const wasOpen = wrap.classList.contains('open')
      closeAll()
      if (!wasOpen) {
        wrap.classList.add('open')
        open = wrap
        setTimeout(() => document.addEventListener('pointerdown', onDoc), 0)
      }
    })
    btn.addEventListener('pointerenter', () => {
      // hover-switch between menus once one is open (native menu-bar feel)
      if (open && open !== wrap) {
        closeAll()
        wrap.classList.add('open')
        open = wrap
        setTimeout(() => document.addEventListener('pointerdown', onDoc), 0)
      }
    })
    wrap.append(btn, drop)
    host.append(wrap)
  }

  const ex = (fmt: ExportFormat, label: string): Item => ({ label, run: () => a.onExport(fmt) })

  menu('File', [
    { label: 'New design…', run: a.onNew },
    { sep: true },
    { label: 'Open project… (.dio)', run: a.onOpenProject },
    { label: 'Save project (.dio)', run: a.onSaveProject },
    { sep: true },
    ex('glb', 'Export 3D — glTF (.glb)'),
    ex('obj', 'Export 3D — OBJ'),
    ex('svg', 'Export pattern — SVG'),
    ex('dxf', 'Export pattern — DXF'),
    ex('techpack', 'Export tech-pack (HTML)'),
    ex('json', 'Export design (JSON)')
  ])
  menu('Edit', [
    { label: 'Undo', run: a.onUndo },
    { label: 'Redo', run: a.onRedo },
    { sep: true },
    { label: 'Cut garment', run: a.onCut },
    { label: 'Copy garment', run: a.onCopy },
    { label: 'Paste garment', run: a.onPaste },
    { label: 'Duplicate garment', run: a.onDuplicate },
    { sep: true },
    { label: 'Delete garment', run: a.onDelete }
  ])
  menu('Avatar', [
    { label: 'Idle', run: () => a.onAnim('idle') },
    { label: 'Walk', run: () => a.onAnim('walk') },
    { label: 'Turntable', run: () => a.onAnim('turn') },
    { label: 'Stand still', run: () => a.onAnim('static') }
  ])
  menu('View', [
    { label: 'Simple / Pro view', run: a.onToggleSimple },
    { sep: true },
    { label: 'Toggle Library', run: a.onToggleLibrary },
    { label: 'Toggle right panel', run: a.onTogglePanel },
    { label: 'Reset layout', run: a.onResetLayout },
    { sep: true },
    { label: 'Wireframe', run: a.onToggleWireframe },
    { label: 'Show / hide mannequin', run: a.onToggleMannequin }
  ])
  menu('Help', [{ label: 'About DesignIO', run: a.onAbout }])
}
