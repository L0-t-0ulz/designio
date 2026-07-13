import { el } from '../ui/controls'
import type { ExportFormat } from '../ui/panel'
import type { AnimationMode } from '../avatar/Mannequin'

export interface MenuActions {
  onNew: () => void
  onProjects: () => void
  onSaveProject: () => void
  onSaveVersion: () => void
  onVersionHistory: () => void
  onExportDio: () => void
  onOpenProject: () => void
  onImportPattern: () => void
  onExport: (fmt: ExportFormat) => void
  onRecordTurntable: () => void
  onRecordTurntableSocial: (preset: string) => void
  onRecordTurntableBlur: () => void
  onRecordSlowMo: () => void
  onUndo: () => void
  onRedo: () => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onDelete: () => void
  /** Enable predicates, re-evaluated each time a menu opens (grey out at boundaries). */
  canUndo: () => boolean
  canRedo: () => boolean
  canPaste: () => boolean
  canModifyLayers: () => boolean
  onAnim: (mode: AnimationMode) => void
  onToggleWireframe: () => void
  onToggleMannequin: () => void
  onMeasure: () => void
  onAnnotate: () => void
  onCameraBookmarks: () => void
  onToggleDOF: () => void
  onToggleGhost: () => void
  onClearMeasure: () => void
  onRunwayLineup: () => void
  onContactSheet: () => void
  onSizeRunStrip: () => void
  onViewer360: () => void
  onLineSheet: () => void
  onQcSheet: () => void
  onSampleOrder: () => void
  onBatchRender: () => void
  onToggleLibrary: () => void
  onTogglePanel: () => void
  onToggleSimple: () => void
  onResetLayout: () => void
  onShortcuts: () => void
  onTour: () => void
  onAbout: () => void
}

interface Item {
  label?: string
  run?: () => void
  disabled?: boolean
  /** Re-evaluated when the menu opens; false → greyed out + inert. */
  enabled?: () => boolean
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
    const rows: { mi: HTMLElement; item: Item }[] = []
    for (const it of items) {
      if (it.sep) {
        drop.append(el('div', 'dio-menu-sep'))
        continue
      }
      const mi = el('button', 'dio-menu-item', it.label)
      mi.addEventListener('click', () => {
        if (mi.classList.contains('disabled')) return
        closeAll()
        it.run?.()
      })
      drop.append(mi)
      rows.push({ mi, item: it })
    }
    // Re-evaluate each item's enabled state when the menu opens (grey out at boundaries).
    const refresh = (): void => {
      for (const { mi, item } of rows) mi.classList.toggle('disabled', item.enabled ? !item.enabled() : !!item.disabled)
    }
    const openThis = (): void => {
      closeAll()
      refresh()
      wrap.classList.add('open')
      open = wrap
      setTimeout(() => document.addEventListener('pointerdown', onDoc), 0)
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const wasOpen = wrap.classList.contains('open')
      closeAll()
      if (!wasOpen) openThis()
    })
    // hover-switch between menus once one is open (native menu-bar feel)
    btn.addEventListener('pointerenter', () => {
      if (open && open !== wrap) openThis()
    })
    wrap.append(btn, drop)
    host.append(wrap)
  }

  const ex = (fmt: ExportFormat, label: string): Item => ({ label, run: () => a.onExport(fmt) })

  menu('File', [
    { label: 'New design…', run: a.onNew },
    { label: 'Your projects…', run: a.onProjects },
    { sep: true },
    { label: 'Save project', run: a.onSaveProject },
    { label: 'Save version (snapshot)', run: a.onSaveVersion },
    { label: 'Version history…', run: a.onVersionHistory },
    { label: 'Export project (.dio)', run: a.onExportDio },
    { label: 'Open project (.dio)…', run: a.onOpenProject },
    { label: 'Import pattern (.dxf)…', run: a.onImportPattern },
    { sep: true },
    ex('glb', 'Export 3D — glTF (.glb)'),
    ex('usdz', 'Export 3D — USDZ (AR · iOS)'),
    ex('obj', 'Export 3D — OBJ'),
    ex('svg', 'Export pattern — SVG'),
    ex('dxf', 'Export pattern — DXF'),
    ex('pattern-tiled', 'Print pattern — tiled A4 (to scale)'),
    ex('techpack', 'Export tech-pack (HTML)'),
    ex('json', 'Export design (JSON)'),
    { sep: true },
    { label: 'Record turntable spin (WebM)', run: a.onRecordTurntable },
    { label: 'Record turntable — 9:16 Reels/TikTok', run: () => a.onRecordTurntableSocial('reel') },
    { label: 'Record turntable — 1:1 square', run: () => a.onRecordTurntableSocial('square') },
    { label: 'Record turntable — 4:5 portrait', run: () => a.onRecordTurntableSocial('portrait') },
    { label: 'Record turntable — motion blur', run: a.onRecordTurntableBlur },
    { label: 'Record slow-motion clip (0.25×, 6 s)', run: a.onRecordSlowMo },
    { label: 'Export runway line-up (PNG)', run: a.onRunwayLineup },
    { label: 'Export contact sheet — multi-angle (PNG)', run: a.onContactSheet },
    { label: 'Export size-run strip — XS→XXL (PNG)', run: a.onSizeRunStrip },
    { label: 'Export 360° viewer (HTML)', run: a.onViewer360 },
    { label: 'Export line sheet (HTML)', run: a.onLineSheet },
    { label: 'Export QC inspection sheet (HTML)', run: a.onQcSheet },
    { label: 'Export sample order (HTML)', run: a.onSampleOrder },
    { label: 'Batch render colourways (ZIP)', run: a.onBatchRender },
    ex('manufacture', 'Export for manufacturing (HTML)'),
    ex('factory-json', 'Export factory pack (JSON · DXF-AAMA embedded)'),
    ex('size-set', 'Export size set — graded patterns XS-XXL (ZIP)')
  ])
  menu('Edit', [
    { label: 'Undo', run: a.onUndo, enabled: a.canUndo },
    { label: 'Redo', run: a.onRedo, enabled: a.canRedo },
    { sep: true },
    { label: 'Cut garment', run: a.onCut, enabled: a.canModifyLayers },
    { label: 'Copy garment', run: a.onCopy },
    { label: 'Paste garment', run: a.onPaste, enabled: a.canPaste },
    { label: 'Duplicate garment', run: a.onDuplicate },
    { sep: true },
    { label: 'Delete garment', run: a.onDelete, enabled: a.canModifyLayers }
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
    { label: 'Measure distances', run: a.onMeasure },
    { label: 'Add annotation', run: a.onAnnotate },
    { label: 'Clear measurements', run: a.onClearMeasure },
    { sep: true },
    { label: 'Camera bookmarks…', run: a.onCameraBookmarks },
    { label: 'Depth of field', run: a.onToggleDOF },
    { label: 'Ghost mannequin (product shot)', run: a.onToggleGhost },
    { sep: true },
    { label: 'Wireframe', run: a.onToggleWireframe },
    { label: 'Show / hide mannequin', run: a.onToggleMannequin }
  ])
  menu('Help', [
    { label: 'Take the tour', run: a.onTour },
    { label: 'Keyboard shortcuts (?)', run: a.onShortcuts },
    { sep: true },
    { label: 'About DesignIO', run: a.onAbout }
  ])
}
