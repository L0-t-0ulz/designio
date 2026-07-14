// Renders the built app in an Electron window and saves a PNG snapshot.
// Usage: npm run build && node scripts/capture.cjs [outfile] [waitMs]
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'designio-preview.png'))
const WAIT = Number(process.argv[3] || 5000)
const SEARCH = process.argv[4] || '' // e.g. "fabric=satin&closeup=1"
const INDEX = path.resolve(__dirname, '..', 'out', 'renderer', 'index.html')
const PRELOAD = path.resolve(__dirname, '..', 'out', 'preload', 'index.js')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    // Offscreen by default (no window pops up); `CAPTURE_SHOW=1` forces a visible window.
    // `paintWhenInitiallyHidden` keeps the renderer painting so the WebGL canvas + sim run
    // while hidden (the app's loop keeps stepping — capturePage still gets a live frame).
    show: process.env.CAPTURE_SHOW === '1',
    paintWhenInitiallyHidden: true,
    webPreferences: { preload: PRELOAD, sandbox: false, backgroundThrottling: false }
  })
  // Forward renderer console lines (verification scripts read [capture-log] output).
  win.webContents.on('console-message', (...args) => {
    // Electron ≤31: (event, level, message, …); ≥32: (event, { message, … })
    const msg = typeof args[1] === 'object' && args[1] !== null ? args[1].message : args[2]
    if (typeof msg === 'string' && msg.includes('[capture-log]')) console.log(msg)
  })
  // Fresh state per capture — no autosave "Recover?" banner or sticky toggles in snapshots.
  await win.webContents.session.clearStorageData({ storages: ['localstorage'] })
  await win.loadFile(INDEX, SEARCH ? { search: SEARCH } : undefined)
  await new Promise((r) => setTimeout(r, WAIT)) // let the cloth fall & drape
  const image = await win.webContents.capturePage()
  fs.writeFileSync(OUT, image.toPNG())
  console.log('WROTE', OUT, fs.statSync(OUT).size, 'bytes')
  app.quit()
})

app.on('window-all-closed', () => app.quit())
