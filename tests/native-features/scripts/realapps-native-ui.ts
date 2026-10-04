import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    platform: { type: 'string' },
    device: { type: 'string' },
    'package-root': { type: 'string' },
    text: { type: 'string' },
    mode: { type: 'string', default: 'home' },
    out: { type: 'string' },
  },
  strict: true,
})
if (
  !['ios', 'android'].includes(values.platform!) ||
  !values.device ||
  !values['package-root'] ||
  !values.out
)
  throw new Error('Expected --platform ios|android --device --package-root --out')
const root = resolve(values['package-root']),
  out = resolve(values.out)
mkdirSync(out, { recursive: true })
const require = createRequire(join(root, 'package.json'))
const { resolveIosBundleId } = await import(
  pathToFileURL(
    join(dirname(require.resolve('vxrn/package.json')), 'dist/utils/nativeRun.mjs')
  ).href
)
const appId =
  values.platform === 'ios'
    ? resolveIosBundleId(root)
    : readFileSync(join(root, 'android/app/build.gradle'), 'utf8').match(
        /applicationId\s+["']([^"']+)/
      )?.[1]
if (!appId) throw new Error('No generated application id')
let flow = `appId: ${appId}\n---\n- launchApp:\n    permissions:\n      all: allow\n`
const visible = (text: string) => {
  flow += `- assertVisible: ${JSON.stringify(text)}\n`
}
const tap = (id: string) => {
  flow += `- tapOn:\n    id: ${id}\n`
}
const scrollTap = (id: string) => {
  flow += `- scrollUntilVisible:\n    element:\n      id: ${id}\n    direction: DOWN\n`
  tap(id)
}
const results: Record<string, any> = {}
let receiptReady: (() => void) | undefined
const requiredByMode: Record<string, string[]> = {
  services: [
    'One.AppInfo',
    'One.Storage',
    'One.SecureStore',
    'One.Clipboard',
    'One.Haptics',
    'One.Speech',
    'One.Updates',
    'One.UI.Fonts',
    'One.LaunchScreen',
    'One.Notifications',
  ],
  ui: [
    'One.UI.SafeArea',
    'useSafeAreaInsets',
    'useSizeClass',
    'One.UI.ReservedRegions',
    'One.UI.Blur',
    'One.UI.Mask',
    'One.UI.EdgeFade',
    'One.UI.Pager',
    'One.UI.Portal',
    'One.UI.PortalHost',
    'One.UI.Image',
  ],
  menus:
    values.platform === 'ios'
      ? ['One.iOS.Menu', 'One.iOS.ContextMenu', 'One.iOS.Alert']
      : ['One.Android.Menu', 'One.Android.ContextMenu', 'One.Android.AlertDialog'],
  widgets: ['One.Widgets', 'One.iOS.WidgetUI', 'One.LiveActivities'],
}
const required = requiredByMode[values.mode!] ?? []
const collector = required.length
  ? Bun.serve({
      port: 8149,
      async fetch(request) {
        if (request.method !== 'POST' || new URL(request.url).pathname !== '/receipt')
          return new Response('Expected POST /receipt', { status: 400 })
        const body = await request.json()
        if (body.schema !== 1 || !body.results)
          return new Response('Invalid receipt', { status: 400 })
        Object.assign(results, body.results)
        writeFileSync(
          join(out, 'api-results.json'),
          JSON.stringify(results, null, 2) + '\n'
        )
        if (
          required.every((api) =>
            ['passed', 'observed', 'failed'].includes(results[api]?.status)
          )
        )
          receiptReady?.()
        return new Response('Recorded')
      },
    })
  : undefined
const received = new Promise<void>((resolve) => {
  receiptReady = resolve
})
if (values.mode === 'home') {
  if (!values.text) throw new Error('Expected --text for original home check')
  visible(values.text)
} else if (values.mode === 'routing') {
  for (const kind of ['stack', 'tabs', 'drawer']) {
    tap(`realapps-open-${kind}`)
    visible(`${kind} count 0`)
    tap('realapps-increment')
    visible(`${kind} count 1`)
    tap('realapps-next')
    visible('Other screen')
    tap('realapps-back')
    visible(`${kind} count 1`)
    flow += `- takeScreenshot: ${kind}-state-on-back\n`
  }
} else if (values.mode === 'services') {
  tap('realapps-open-api')
  tap('realapps-api-core')
  scrollTap('realapps-api-font')
  visible('Font loaded: true')
  scrollTap('realapps-api-launch-hide')
} else if (values.mode === 'ui') {
  tap('realapps-open-api')
  tap('realapps-api-section-ui')
  flow += '- takeScreenshot: native-blur-and-mask\n'
  scrollTap('realapps-api-blur-toggle')
  scrollTap('realapps-api-mask-toggle')
  flow += '- takeScreenshot: native-mask-full-and-edgefade\n'
  scrollTap('realapps-api-pager-next')
  visible('Page one')
  scrollTap('realapps-api-pager-back')
  visible('Page zero')
  scrollTap('realapps-api-portal-hit')
  visible('Portal hit 1')
  flow += '- takeScreenshot: native-pager-portal-image\n'
} else if (values.mode === 'menus') {
  tap('realapps-open-api')
  tap('realapps-api-section-menus')
  tap('realapps-api-menu-open')
  visible('Matrix menu hit')
  flow += '- tapOn: "Matrix menu hit"\n'
  flow += '- longPressOn:\n    id: realapps-api-context-open\n'
  visible('Matrix menu hit')
  flow += '- tapOn: "Matrix menu hit"\n'
  tap('realapps-api-alert-open')
  visible('Matrix alert')
  flow += '- tapOn: "Matrix confirm"\n'
} else if (values.mode === 'widgets') {
  if (values.platform !== 'ios') throw new Error('Widgets require iOS')
  tap('realapps-open-api')
  tap('realapps-api-section-widgets')
  scrollTap('realapps-api-widgets-write')
  scrollTap('realapps-api-widgets-jsx')
  scrollTap('realapps-api-activity-cycle')
} else throw new Error(`Unknown UI mode ${values.mode}`)
flow += '- takeScreenshot: final\n'
const path = join(out, `${values.mode}.yaml`)
writeFileSync(path, flow)
try {
  const process = Bun.spawn(
    ['maestro', '--device', values.device, 'test', '--test-output-dir', out, path],
    { stdout: 'inherit', stderr: 'inherit' }
  )
  const status = await process.exited
  if (status) throw new Error(`Maestro exited ${status}; see ${out}`)
  if (collector) {
    await Promise.race([
      received,
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Missing API receipts: ${required.filter((api) => !['passed', 'observed', 'failed'].includes(results[api]?.status)).join(', ')}`
              )
            ),
          5000
        )
      ),
    ])
    const failed = required.filter((api) => results[api].status === 'failed')
    if (failed.length)
      throw new Error(`API assertions failed: ${failed.join(', ')}; see api-results.json`)
  }
} finally {
  collector?.stop(true)
}
writeFileSync(
  join(out, 'receipt.json'),
  JSON.stringify(
    {
      label: 'RAN',
      platform: values.platform,
      device: values.device,
      appId,
      mode: values.mode,
      text: values.text,
      ...(values.mode === 'routing' ? { stack: 1, tabs: 1, drawer: 1 } : {}),
    },
    null,
    2
  ) + '\n'
)
console.log(`RAN ${appId} ${values.platform} ${values.mode} assertions passed`)
