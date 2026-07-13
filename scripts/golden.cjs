// Golden-image snapshot tests — renders a fixed set of deep-linked looks and
// diffs them against the goldens committed in tests/golden/, catching visual
// regressions each PR. Also renders every look TWICE and asserts the repeats
// match, so a nondeterminism regression (RNG/wall-clock leaking into the
// render) fails even before goldens exist.
//
// Usage (after npm run build):
//   npx electron scripts/golden.cjs --check    # CI: compare vs tests/golden/
//   npx electron scripts/golden.cjs --update   # regenerate tests/golden/*.png
//
// Goldens are rendered on CI's GL stack (linux + SwiftShader — forced below, so
// the rasterizer is software + reproducible). A missing golden is a bootstrap
// warning, not a failure: the fresh render lands in golden-out/ (uploaded as a
// CI artifact) ready to be committed.
const { app, BrowserWindow, nativeImage } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { diffStats, formatDiff, dropBottomRows } = require('./imageDiff.cjs')

// The looks under regression watch — windless + static body so both cloth
// solvers reach their dead-stop sleep and the settled frame is deterministic.
// body=mesh keeps the async GLB swap out of the timing. Free-hanging,
// single-piece garments only: sleeves (inter-piece) or a pooled gown train
// (self-contact) keep the stack's particle repulsion ticking, so those solvers
// never reach the dead-stop and the settle phase varies per run.
const LOOKS = [
  { name: 'dress-mesh', search: 'start=0&garment=dress&body=mesh', wait: 15000 },
  { name: 'skirt-closure', search: 'start=0&garment=skirt&closure=1&body=mesh', wait: 15000 },
  { name: 'dress-dramatic', search: 'start=0&garment=dress&body=mesh&light=dramatic&backdrop=charcoal', wait: 15000 }
]

// The status bar's live fps/step readout is legitimately nondeterministic —
// trim it (26 px bar + border, in DIPs) from every diff.
const STATUS_ROWS = 32

// Pass bars: repeats of the same build must be essentially identical — real
// nondeterminism (a garment that never sleeps) measures 1–3%, AA micro-wiggle
// under hardware GL ≤ ~0.1%, so 0.25% splits them with margin either way. The
// golden compare gets extra headroom for runner-image drift (fonts, AA tables).
const REPEAT_MAX_PCT = 0.25
const GOLDEN_MAX_PCT = 1.0

const MODE = process.argv.includes('--update') ? 'update' : 'check'
const ROOT = path.resolve(__dirname, '..')
const GOLDEN_DIR = path.join(ROOT, 'tests', 'golden')
const OUT_DIR = path.join(ROOT, 'golden-out')
const INDEX = path.join(ROOT, 'out', 'renderer', 'index.html')
const PRELOAD = path.join(ROOT, 'out', 'preload', 'index.js')

// Deterministic software rasterizer on linux (the CI platform the goldens are
// rendered on). Mac/Windows keep hardware GL for local eyeballing — their
// pixels are NOT expected to match the committed goldens.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('use-angle', 'swiftshader')
  app.commandLine.appendSwitch('enable-unsafe-swiftshader')
}

/** Bitmap minus the status bar. DPR-aware: infers the scale from the buffer. */
function pixels(img) {
  const bmp = img.toBitmap()
  const sz = img.getSize()
  const scale = Math.round(Math.sqrt(bmp.length / 4 / (sz.width * sz.height))) || 1
  return dropBottomRows(bmp, sz.width * scale, STATUS_ROWS * scale)
}

async function render(search, wait) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: { preload: PRELOAD, sandbox: false, backgroundThrottling: false }
  })
  await win.webContents.session.clearStorageData({ storages: ['localstorage'] })
  await win.loadFile(INDEX, { search })
  await new Promise((r) => setTimeout(r, wait)) // cloth falls, drapes, sleeps
  const image = await win.webContents.capturePage()
  win.destroy()
  return image
}

let done = false // windows are created + destroyed per render — don't quit between them

app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  if (MODE === 'update') fs.mkdirSync(GOLDEN_DIR, { recursive: true })
  let failures = 0
  let missing = 0
  for (const look of LOOKS) {
    const img = await render(look.search, look.wait)
    fs.writeFileSync(path.join(OUT_DIR, `${look.name}.png`), img.toPNG())
    if (MODE === 'update') {
      fs.writeFileSync(path.join(GOLDEN_DIR, `${look.name}.png`), img.toPNG())
      console.log(`UPDATED tests/golden/${look.name}.png`)
      continue
    }
    // determinism: a second, fresh render of the same build must match
    const repeat = await render(look.search, look.wait)
    const rs = diffStats(pixels(img), pixels(repeat), { threshold: 4 })
    console.log(formatDiff(`${look.name} [repeat]`, rs))
    if (!rs.comparable || rs.pct > REPEAT_MAX_PCT) {
      console.error(`FAIL ${look.name}: repeated render differs — the look is not deterministic`)
      failures++
    }
    // golden: compare against the committed reference
    const goldenPath = path.join(GOLDEN_DIR, `${look.name}.png`)
    if (!fs.existsSync(goldenPath)) {
      console.log(`::warning::${look.name}: no golden committed — bootstrap render in golden-out/ (commit it to tests/golden/)`)
      missing++
      continue
    }
    const golden = nativeImage.createFromPath(goldenPath)
    const gs = diffStats(pixels(img), pixels(golden), { threshold: 12 })
    console.log(formatDiff(`${look.name} [golden]`, gs))
    if (!gs.comparable || gs.pct > GOLDEN_MAX_PCT) {
      console.error(`FAIL ${look.name}: render drifted from tests/golden/${look.name}.png (see the golden-out artifact; refresh via scripts/golden.cjs --update if intended)`)
      failures++
    }
  }
  if (missing) console.log(`${missing} golden(s) missing — bootstrap renders uploaded, not failing`)
  console.log(failures ? `GOLDEN CHECK FAILED (${failures})` : 'GOLDEN CHECK OK')
  done = true
  app.exit(failures ? 1 : 0) // app.quit() would discard process.exitCode
})

app.on('window-all-closed', () => {
  if (done) app.quit()
})
