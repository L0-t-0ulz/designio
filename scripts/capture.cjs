// Renders the built app in an Electron window and saves a PNG snapshot.
// Usage: npm run build && node scripts/capture.cjs [outfile] [waitMs]
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'designio-preview.png'))
const WAIT = Number(process.argv[3] || 5000)
const INDEX = path.resolve(__dirname, '..', 'out', 'renderer', 'index.html')
const PRELOAD = path.resolve(__dirname, '..', 'out', 'preload', 'index.js')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: true,
    webPreferences: { preload: PRELOAD, sandbox: false }
  })
  await win.loadFile(INDEX)
  await new Promise((r) => setTimeout(r, WAIT)) // let the cloth fall & drape
  const image = await win.webContents.capturePage()
  fs.writeFileSync(OUT, image.toPNG())
  console.log('WROTE', OUT, fs.statSync(OUT).size, 'bytes')
  app.quit()
})

app.on('window-all-closed', () => app.quit())
