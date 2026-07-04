export interface SaveFilter {
  name: string
  extensions: string[]
}

interface DesignioApi {
  saveFile(name: string, data: string | Uint8Array, filters?: SaveFilter[]): Promise<string | null>
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
