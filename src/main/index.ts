import { app, BrowserWindow, Menu, shell, type Session } from 'electron'
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
