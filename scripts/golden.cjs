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

// The looks under regression watch — windless + static body, and every render
// runs in deterministic snapshot mode (`freezeAt`, appended below): the sim
// halts at the exact same fixed step every run, so the captured drape is
// identical however fast or slow the frames rendered — even for a look whose
// stack repulsion (inter-piece or self-contact) never lets the solvers fully
// sleep. body=mesh keeps the async GLB swap out of the timing.
const LOOKS = [
  { name: 'dress-mesh', search: 'start=0&garment=dress&body=mesh' },
  { name: 'skirt-closure', search: 'start=0&garment=skirt&closure=1&body=mesh' },
  { name: 'dress-dramatic', search: 'start=0&garment=dress&body=mesh&light=dramatic&backdrop=charcoal' }
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

// Each render captures when the app reports the sim frozen at FREEZE_AT_S sim
// seconds (drape settles by ~10 s; sleep may never engage — see LOOKS), not
// after a fixed wall-clock wait: under SwiftShader the loop's catch-up cap
// makes sim time lag wall time, so a wall wait would grab a mid-fall frame.
// The cap only bounds a broken settle (seen as a repeat-diff FAIL, not a
// hang); the whole run is additionally watchdogged well under the job limit.
const FREEZE_AT_S = 15
// SwiftShader renders ~1 fps, where the loop's default 8-step catch-up makes sim
// time crawl at ~13% of wall time — raise it so the freeze mark arrives within a
// few frames (the step sequence, hence the frozen state, is identical either way).
const CATCH_UP_STEPS = 60
const SETTLE_CAP_MS = 180_000
const WATCHDOG_MS = 25 * 60 * 1000

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
  // SwiftShader legitimately blocks for tens of seconds (shader compiles, big
  // readbacks) on a small runner; Chromium's GPU watchdog reads that as a hang
  // and kills the GPU process (exit code 2 → capturePage rejects UnknownVizError).
  app.commandLine.appendSwitch('disable-gpu-watchdog')
}

// This script must fail, never hang: a swallowed capturePage rejection once
// idled the CI job for the full 6 h limit.
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err)
  app.exit(1)
})
setTimeout(() => {
  console.error(`WATCHDOG: golden run exceeded ${WATCHDOG_MS / 60000} min — exiting`)
  app.exit(2)
}, WATCHDOG_MS)
app.on('child-process-gone', (_e, d) => {
  // Diagnostic only — Chromium relaunches a crashed GPU process; if the render
  // is truly broken the capture/diff below fails with this context in the log.
  console.error(`child process gone: type=${d.type} reason=${d.reason} exitCode=${d.exitCode}`)
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Bitmap minus the status bar. DPR-aware: infers the scale from the buffer. */
function pixels(img) {
  const bmp = img.toBitmap()
  const sz = img.getSize()
  const scale = Math.round(Math.sqrt(bmp.length / 4 / (sz.width * sz.height))) || 1
  return dropBottomRows(bmp, sz.width * scale, STATUS_ROWS * scale)
}

/** Poll the app's settle hook until the sim froze at its mark (two consecutive
 *  trues, then a beat for the final frame to present). The sim's step sequence
 *  is frame-rate independent, so this state is identical however slow the frames. */
async function settle(wc) {
  const t0 = Date.now()
  let stillFor = 0
  while (Date.now() - t0 < SETTLE_CAP_MS) {
    const settled = await wc
      .executeJavaScript('typeof window.__drapeSettled === "function" && window.__drapeSettled()', true)
      .catch(() => false)
    stillFor = settled ? stillFor + 1 : 0
    if (stillFor >= 2) {
      await sleep(500)
      return
    }
    await sleep(250)
  }
  console.log(`::warning::drape never settled within ${SETTLE_CAP_MS / 1000}s — capturing anyway`)
}

const newWin = () =>
  new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: { preload: PRELOAD, sandbox: false, backgroundThrottling: false }
  })

// One window is reused across every render (each loadFile reinitialises the app
// from scratch): under SwiftShader the first load pays minutes of shader
// compilation, and reuse keeps that cache warm for the renders after it.
async function render(win, name, search) {
  const t0 = Date.now()
  // Unload the previous look FIRST (its on-close autosave writes localStorage as
  // it unloads), THEN wipe storage — else the stale autosave survives the clear
  // and the next load shows a "Recover unsaved work?" banner in the capture.
  await win.loadURL('about:blank')
  await win.webContents.session.clearStorageData({ storages: ['localstorage'] })
  await win.loadFile(INDEX, { search: `${search}&freezeAt=${FREEZE_AT_S}&catchUp=${CATCH_UP_STEPS}` })
  await settle(win.webContents) // cloth falls, drapes, freezes at the mark
  const image = await win.webContents.capturePage()
  console.log(`rendered ${name} in ${Math.round((Date.now() - t0) / 1000)}s`)
  return image
}

let done = false // the render window churns on errors — don't quit before the run finishes

app
  .whenReady()
  .then(async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    if (MODE === 'update') fs.mkdirSync(GOLDEN_DIR, { recursive: true })
    let failures = 0
    let missing = 0
    let win = newWin()
    for (const look of LOOKS) {
      try {
        const img = await render(win, look.name, look.search)
        fs.writeFileSync(path.join(OUT_DIR, `${look.name}.png`), img.toPNG())
        if (MODE === 'update') {
          fs.writeFileSync(path.join(GOLDEN_DIR, `${look.name}.png`), img.toPNG())
          console.log(`UPDATED tests/golden/${look.name}.png`)
          continue
        }
        // determinism: a second, fresh render of the same build must match
        const repeat = await render(win, `${look.name} again`, look.search)
        const rs = diffStats(pixels(img), pixels(repeat), { threshold: 4 })
        console.log(formatDiff(`${look.name} [repeat]`, rs))
        if (!rs.comparable || rs.pct > REPEAT_MAX_PCT) {
          console.error(`FAIL ${look.name}: repeated render differs — the look is not deterministic`)
          fs.writeFileSync(path.join(OUT_DIR, `${look.name}.repeat.png`), repeat.toPNG()) // for diffing
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
      } catch (err) {
        console.error(`FAIL ${look.name}: render error —`, err)
        failures++
        win.destroy() // the shared window may be wedged — fresh one for the next look
        win = newWin()
      }
    }
    win.destroy()
    if (missing) console.log(`${missing} golden(s) missing — bootstrap renders uploaded, not failing`)
    console.log(failures ? `GOLDEN CHECK FAILED (${failures})` : 'GOLDEN CHECK OK')
    done = true
    app.exit(failures ? 1 : 0) // app.quit() would discard process.exitCode
  })
  .catch((err) => {
    console.error('GOLDEN RUN CRASHED:', err)
    app.exit(1)
  })

app.on('window-all-closed', () => {
  if (done) app.quit()
})
