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
    ipcRenderer.invoke('dialog:saveFile', { name, data, filters }),
  /** Show an open dialog and read a text file. Returns { path, content } or null. */
  openFile: (filters?: SaveFilter[]): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('dialog:openFile', { filters })
}

contextBridge.exposeInMainWorld('designio', api)

export type DesignioApi = typeof api
