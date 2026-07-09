/**
 * Non-blocking **toast** notifications — a small stack of auto-dismissing banners
 * bottom-right, used instead of `window.alert` so an error (export/import failure,
 * …) doesn't freeze the app or trap focus. `role="alert"` for errors so they're
 * announced. Self-mounting; call `showToast(msg, kind)` from anywhere.
 */
export type ToastKind = 'info' | 'success' | 'error'

let container: HTMLElement | null = null

function ensureContainer(): HTMLElement {
  if (container && container.isConnected) return container
  container = document.createElement('div')
  container.className = 'dio-toasts'
  document.body.appendChild(container)
  return container
}

/** Show a toast. Errors persist a little longer + read as `role="alert"`. */
export function showToast(message: string, kind: ToastKind = 'info', ms = kind === 'error' ? 6000 : 3500): void {
  const host = ensureContainer()
  const toast = document.createElement('div')
  toast.className = `dio-toast dio-toast-${kind}`
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status')

  const text = document.createElement('span')
  text.className = 'dio-toast-msg'
  text.textContent = message
  const close = document.createElement('button')
  close.className = 'dio-toast-close'
  close.setAttribute('aria-label', 'Dismiss')
  close.textContent = '×'
  toast.append(text, close)
  host.appendChild(toast)

  let timer = 0
  const dismiss = (): void => {
    window.clearTimeout(timer)
    toast.classList.remove('show')
    window.setTimeout(() => toast.remove(), 200)
  }
  close.addEventListener('click', dismiss)
  requestAnimationFrame(() => toast.classList.add('show'))
  timer = window.setTimeout(dismiss, ms)
}
