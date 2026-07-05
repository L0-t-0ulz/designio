import Split from 'split.js'
import { el } from '../ui/controls'
import { clearLayout, loadLayout, saveLayout, type ShellLayout } from './layoutStore'

/**
 * The professional studio shell: a menu bar, a resizable body (centre viewport +
 * right dock), and a status bar. Vanilla — CSS + split.js + localStorage. Regions
 * are mount points the caller fills; the left Library column arrives in a later phase.
 */
export interface StudioShell {
  root: HTMLElement
  menubar: HTMLElement
  center: HTMLElement
  right: HTMLElement
  statusbar: HTMLElement
  /** Show/hide the right dock (re-fits the viewport). */
  toggleRight(): void
  rightVisible(): boolean
  /** Reset splitter sizes + visibility to defaults. */
  resetLayout(): void
  /** Remove the shell from the DOM (e.g. going back to the start page). */
  dispose(): void
}

export function createStudioShell(onLayout: () => void): StudioShell {
  const root = el('div', 'dio-shell')
  const menubar = el('div', 'dio-shell-menubar')
  const body = el('div', 'dio-shell-body')
  const center = el('div', 'dio-shell-center')
  const right = el('div', 'dio-shell-right')
  const statusbar = el('div', 'dio-shell-status')
  body.append(center, right)
  root.append(menubar, body, statusbar)
  document.body.append(root)

  const layout: ShellLayout = loadLayout()
  let split: ReturnType<typeof Split> | null = null

  const persist = (): void => saveLayout(layout)

  const buildSplit = (): void => {
    split?.destroy()
    split = null
    if (layout.rightVisible) {
      right.style.display = ''
      split = Split([center, right], {
        sizes: layout.sizes,
        minSize: [360, 240],
        gutterSize: 6,
        snapOffset: 0,
        onDrag: onLayout,
        onDragEnd: (sizes: number[]) => {
          layout.sizes = [sizes[0], sizes[1]]
          persist()
          onLayout()
        }
      })
    } else {
      right.style.display = 'none'
      center.style.width = '100%'
    }
    onLayout()
  }
  buildSplit()

  const onWinResize = (): void => onLayout()
  window.addEventListener('resize', onWinResize)

  return {
    root,
    menubar,
    center,
    right,
    statusbar,
    rightVisible: () => layout.rightVisible,
    toggleRight() {
      if (split) layout.sizes = split.getSizes() as [number, number]
      layout.rightVisible = !layout.rightVisible
      persist()
      buildSplit()
    },
    resetLayout() {
      clearLayout()
      layout.sizes = [74, 26]
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
