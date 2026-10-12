const { createRequire } = require('node:module')
const { resolve } = require('node:path')
const { execFileSync } = require('node:child_process')
const requireBrowser = process.env.PLAYWRIGHT_MODULE
  ? createRequire(resolve(process.env.PLAYWRIGHT_MODULE, 'package.json'))
  : require
const { chromium } = requireBrowser('playwright')
const sharp = require('sharp')
const destination = resolve(__dirname, '../evidence/one-native-web')
;(async () => {
  const source = execFileSync('git', ['show', '3febba064:packages/one/src/platform/effects/index.ts'], { encoding: 'utf8' })
  const bodies = ['Blur', 'Mask'].map(name => source.match(new RegExp(`export function ${name}\\([^)]*\\): ReactElement \\{([^}]+)\\}`))[1])
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 480, height: 480 } })
    await page.goto('http://127.0.0.1:4387')
    const errors = await page.evaluate((bodies) => bodies.map(body => {
      try { new Function(body)({}); throw new Error('baseline unexpectedly rendered') }
      catch(error) { return error.message }
    }), bodies)
    if (errors.join('|') !== 'Blur requires a native build|Mask requires a native build') throw new Error('baseline differs')
    await page.setContent(`<body style="margin:0;font:16px system-ui;background:#f5f5f5"><div style="padding:24px"><p>The previous web functions throw:</p><pre style="white-space:pre-wrap">${errors.join('\n\n')}</pre></div></body>`)
    const before = await page.screenshot({ path: resolve(destination, 'effects-before.png') })
    const label = Buffer.from('<svg width="960" height="48"><rect width="960" height="48" fill="white"/><g font-family="sans-serif" font-size="18" fill="black"><text x="24" y="31">Before: web effects unavailable</text><text x="504" y="31">After: CSS blur and alpha clipping</text></g></svg>')
    await sharp({ create: { width: 960, height: 528, channels: 4, background: '#ffffff' } }).composite([
      { input: label, top: 0, left: 0 },
      { input: before, top: 48, left: 0 },
      { input: resolve(destination, 'chromium-effects.png'), top: 48, left: 480 },
    ]).webp({ quality: 90 }).toFile(resolve(destination, 'effects-before-after.webp'))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
