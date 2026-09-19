import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type Session } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const REPO_URL = 'https://github.com/ZayanKhan-12/designio'

/**
 * Content-Security-Policy for the packaged app (file:// renderer). Not applied
 * in dev so the Vite dev server / HMR keeps working. `unsafe-inline` for styles
 * is needed because lil-gui injects a stylesheet; blob:/data: cover generated
 * textures.
 */
function applyProductionCSP(session: Session): void {
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:"
        ]
      }
    })
  })
}

/**
 * Compress a GLB with Draco on behalf of the renderer, which has no Node access.
 * Errors are returned rather than thrown across the bridge, so the renderer can fall
 * back to the uncompressed export and say why instead of failing silently.
 */
ipcMain.handle('gltf:draco', async (_e, glb: Uint8Array): Promise<{ data: Uint8Array } | { error: string }> => {
  try {
    const { compressGLBWithDraco } = await import('./draco')
    return { data: await compressGLBWithDraco(new Uint8Array(glb)) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
})

function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' }, // Reload, Toggle DevTools, zoom, fullscreen
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [{ label: 'DesignIO on GitHub', click: () => shell.openExternal(REPO_URL) }]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#16161c',
    title: 'DesignIO',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())

  // Open external links in the OS browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // electron-vite injects ELECTRON_RENDERER_URL in dev (Vite dev server).
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    applyProductionCSP(win.webContents.session)
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Save-file bridge for the exporters (glTF/OBJ/SVG/DXF/tech-pack).
ipcMain.handle(
  'dialog:saveFile',
  async (_event, { name, data, filters }: { name: string; data: string | Uint8Array; filters?: Electron.FileFilter[] }) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(win!, { defaultPath: name, filters })
    if (canceled || !filePath) return null
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)
    await writeFile(filePath, buffer)
    return filePath
  }
)

// Open-file bridge for reopening `.dio` projects.
ipcMain.handle('dialog:openFile', async (_event, { filters }: { filters?: Electron.FileFilter[] }) => {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const { canceled, filePaths } = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters })
  if (canceled || !filePaths[0]) return null
  const content = await readFile(filePaths[0], 'utf8')
  return { path: filePaths[0], content }
})

app.whenReady().then(() => {
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
