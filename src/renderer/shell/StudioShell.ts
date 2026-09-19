import Split from 'split.js'
import { el } from '../ui/controls'
import { clearLayout, loadLayout, saveLayout, type PanelDensity, type ShellLayout } from './layoutStore'

/**
 * The professional studio shell: a menu bar, a resizable body (left Library ·
 * centre viewport · right dock), and a status bar. Vanilla — CSS + split.js +
 * localStorage. Regions are mount points the caller fills.
 */
export interface StudioShell {
  root: HTMLElement
  menubar: HTMLElement
  left: HTMLElement
  center: HTMLElement
  right: HTMLElement
  statusbar: HTMLElement
  toggleLeft(): void
  setLeftVisible(v: boolean): void
  toggleRight(): void
  leftVisible(): boolean
  rightVisible(): boolean
  /** Control spacing in the docked panels. */
  density(): PanelDensity
  setDensity(d: PanelDensity): void
  toggleDensity(): void
  resetLayout(): void
  dispose(): void
}

export function createStudioShell(onLayout: () => void): StudioShell {
  const root = el('div', 'dio-shell')
  const menubar = el('div', 'dio-shell-menubar')
  const body = el('div', 'dio-shell-body')
  const left = el('div', 'dio-shell-left')
  const center = el('div', 'dio-shell-center')
  const right = el('div', 'dio-shell-right')
  const statusbar = el('div', 'dio-shell-status')
  body.append(left, center, right)
  root.append(menubar, body, statusbar)
  document.body.append(root)

  const layout: ShellLayout = loadLayout()
  let split: ReturnType<typeof Split> | null = null
  const persist = (): void => saveLayout(layout)

  /** The visible columns, in order, with their weight index into layout.sizes. */
  const visibleCols = (): { el: HTMLElement; key: number }[] => {
    const cols: { el: HTMLElement; key: number }[] = []
    if (layout.leftVisible) cols.push({ el: left, key: 0 })
    cols.push({ el: center, key: 1 })
    if (layout.rightVisible) cols.push({ el: right, key: 2 })
    return cols
  }

  /** Save the live splitter sizes back into the 3-weight array (before a rebuild). */
  const captureSizes = (): void => {
    if (!split) return
    const s = split.getSizes()
    visibleCols().forEach((c, i) => (layout.sizes[c.key] = s[i]))
  }

  const buildSplit = (): void => {
    split?.destroy()
    split = null
    left.style.display = layout.leftVisible ? '' : 'none'
    right.style.display = layout.rightVisible ? '' : 'none'
    for (const c of [left, center, right]) c.style.width = ''

    const cols = visibleCols()
    if (cols.length >= 2) {
      const raw = cols.map((c) => layout.sizes[c.key])
      const sum = raw.reduce((a, b) => a + b, 0) || 1
      split = Split(
        cols.map((c) => c.el),
        {
          sizes: raw.map((v) => (v / sum) * 100),
          minSize: cols.map((c) => (c.key === 1 ? 320 : 220)),
          gutterSize: 6,
          snapOffset: 0,
          onDrag: onLayout,
          onDragEnd: (s: number[]) => {
            cols.forEach((c, i) => (layout.sizes[c.key] = s[i]))
            persist()
            onLayout()
          }
        }
      )
    } else {
      center.style.width = '100%'
    }
    onLayout()
  }
  buildSplit()

  const onWinResize = (): void => onLayout()
  window.addEventListener('resize', onWinResize)

  /** The density lives as a class on the shell root, so every docked panel inherits
   *  it from one place rather than each control knowing about it. */
  const applyDensity = (): void => {
    root.classList.toggle('dio-compact', layout.density === 'compact')
  }
  applyDensity()

  return {
    root,
    menubar,
    left,
    center,
    right,
    statusbar,
    leftVisible: () => layout.leftVisible,
    rightVisible: () => layout.rightVisible,
    density: () => layout.density,
    setDensity(d: PanelDensity) {
      layout.density = d
      applyDensity()
      persist()
    },
    toggleDensity() {
      this.setDensity(layout.density === 'compact' ? 'comfortable' : 'compact')
    },
    toggleLeft() {
      captureSizes()
      layout.leftVisible = !layout.leftVisible
      persist()
      buildSplit()
    },
    setLeftVisible(v: boolean) {
      if (layout.leftVisible === v) return
      captureSizes()
      layout.leftVisible = v
      persist()
      buildSplit()
    },
    toggleRight() {
      captureSizes()
      layout.rightVisible = !layout.rightVisible
      persist()
      buildSplit()
    },
    resetLayout() {
      clearLayout()
      layout.sizes = [18, 56, 26]
      layout.leftVisible = true
      layout.rightVisible = true
      buildSplit()
    },
    dispose() {
      split?.destroy()
      window.removeEventListener('resize', onWinResize)
      root.remove()
    }
  }
}
