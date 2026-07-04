import { contextBridge, ipcRenderer } from 'electron'

export interface SaveFilter {
  name: string
  extensions: string[]
}

// Minimal, safe bridge. Grows as the app needs OS access.
const api = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  /** Show a save dialog and write text or binary data. Returns the path or null. */
  saveFile: (name: string, data: string | Uint8Array, filters?: SaveFilter[]): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveFile', { name, data, filters })
}

contextBridge.exposeInMainWorld('designio', api)

export type DesignioApi = typeof api
