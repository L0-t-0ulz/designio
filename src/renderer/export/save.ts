export interface SaveFilter {
  name: string
  extensions: string[]
}

interface DesignioApi {
  saveFile(name: string, data: string | Uint8Array, filters?: SaveFilter[]): Promise<string | null>
  openFile?(filters?: SaveFilter[]): Promise<{ path: string; content: string } | null>
}

declare global {
  interface Window {
    designio?: DesignioApi
  }
}

/**
 * Save data to disk via the Electron save dialog; falls back to a browser
 * download if the bridge isn't present (e.g. running the renderer in a browser).
 */
export async function saveFile(
  name: string,
  data: string | Uint8Array,
  filters?: SaveFilter[]
): Promise<void> {
  const api = window.designio
  if (api) {
    await api.saveFile(name, data, filters)
    return
  }
  const blob =
    data instanceof Uint8Array
      ? new Blob([new Uint8Array(data)])
      : new Blob([data], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Open a text file via the Electron open dialog; falls back to a hidden file
 * input in the browser. Returns the file's text (+ path) or null if cancelled.
 */
export async function openFile(filters?: SaveFilter[]): Promise<{ path: string; content: string } | null> {
  const api = window.designio
  if (api?.openFile) return api.openFile(filters)
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (filters?.[0]) input.accept = filters[0].extensions.map((e) => '.' + e).join(',')
    input.addEventListener('change', () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve({ path: f.name, content: String(reader.result) })
      reader.readAsText(f)
    })
    input.click()
  })
}
