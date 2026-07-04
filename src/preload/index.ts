import { contextBridge } from 'electron'

// Minimal, safe bridge. Grows later (e.g. save/load pattern & garment files).
const api = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

contextBridge.exposeInMainWorld('designio', api)

export type DesignioApi = typeof api
