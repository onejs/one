import { modeAPIs } from '../fixtures/realapps-api-coverage'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    platform: { type: 'string' },
    device: { type: 'string' },
    machine: { type: 'string' },
    'package-root': { type: 'string' },
    text: { type: 'string' },
    mode: { type: 'string', default: 'home' },
    apis: { type: 'string' },
    out: { type: 'string' },
  },
  strict: true,
})
if (
  !['ios', 'android'].includes(values.platform!) ||
  !values.device ||
  !values['package-root'] ||
  !values.text ||
  !values.out
)
  throw new Error('Expected --platform ios|android --device --package-root --text <original home marker> --out')
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
let flow = `appId: ${appId}\n---\n- launchApp:\n    stopApp: true\n    permissions: {}\n`
const visible = (text: string) => {
  flow += `- assertVisible: ${JSON.stringify(text)}\n`
}
const tap = (id: string) => {
  flow += `- tapOn:\n    id: ${id}\n`
}
const scrollTap = (id: string) => {
  flow += `- scrollUntilVisible:\n    element:\n      id: ${id}\n    direction: DOWN\n    visibilityPercentage: 100\n`
  flow += `- assertVisible:\n    id: ${id}\n`
  tap(id)
}
const results: Record<string, any> = {}
let receiptReady: (() => void) | undefined
const modeRequired = modeAPIs(values.mode!, values.platform!)
const required = values.apis ? values.apis.split(',') : modeRequired
if (required.some((api) => !modeRequired.includes(api)))
  throw new Error('Requested API is not covered by this mode')
const collector = required.length
  ? Bun.serve({
      port: 8149,
      async fetch(request) {
        if (request.method !== 'POST' || new URL(request.url).pathname !== '/receipt')
          return new Response('Expected POST /receipt', { status: 400 })
        const body = await request.json()
        if (body.schema !== 1 || !body.results)
          return new Response('Invalid receipt', { status: 400 })
        for (const [api, result] of Object.entries(body.results) as [string, any][]) {
          if (result.status === 'pending' || results[api]?.status === 'failed') continue
          results[api] = result
        }
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
if (values.platform === 'android')
  flow += '- runFlow:\n    when:\n      visible: "Allow .* to find, connect to, and determine the relative position of nearby devices.*"\n    commands:\n      - tapOn:\n          id: com.android.permissioncontroller:id/permission_allow_button\n'
flow += `- extendedWaitUntil:\n    visible: ${JSON.stringify(values.text)}\n    timeout: 60000\n`
if (values.mode !== 'home')
  flow += '- extendedWaitUntil:\n    visible:\n      id: realapps-open-api\n    timeout: 60000\n'
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
  tap('realapps-api-section-services')
  visible('Notification permission: (undetermined|granted|denied)')
  flow += '- runFlow:\n    when:\n      visible: "Notification permission: undetermined"\n    commands:\n      - tapOn:\n          id: realapps-api-notification-permission\n      - tapOn: "Allow"\n'
  visible('Notification permission: granted')
  tap('realapps-api-core')
  visible('Core checks complete')
  scrollTap('realapps-api-font')
  visible('Font loaded: true')
  scrollTap('realapps-api-launch-hide')
} else if (values.mode === 'external') {
  tap('realapps-open-api')
  tap('realapps-api-section-services')
  scrollTap('realapps-api-image-picker-cancel')
  if (values.platform === 'ios') flow += '- tapOn: "Cancel"\n'
  else flow += '- back\n'
  scrollTap('realapps-api-document-picker-cancel')
  if (values.platform === 'ios') flow += '- tapOn: "Cancel"\n'
  else flow += '- back\n'
  scrollTap('realapps-api-browser-cancel')
  flow += '- takeScreenshot: system-browser\n'
  if (values.platform === 'ios') {
    visible('Close')
    flow += '- tapOn: "Close"\n'
  }
  else flow += '- back\n'
  scrollTap('realapps-api-share-cancel')
  flow += '- takeScreenshot: system-share\n'
  if (values.platform === 'ios') {
    visible('Copy')
    flow += '- swipe:\n    start: 50%, 65%\n    end: 50%, 95%\n'
  }
  else flow += '- back\n'
  scrollTap('realapps-api-open-url')
  flow += '- takeScreenshot: system-url\n'
  flow += '- launchApp:\n    stopApp: false\n    permissions: {}\n'
  scrollTap('realapps-api-open-settings')
  flow += '- takeScreenshot: system-settings\n'
  flow += '- launchApp:\n    stopApp: false\n    permissions: {}\n'
  visible('Injected route remains inside the original shell')
} else if (values.mode === 'ui') {
  tap('realapps-open-api')
  tap('realapps-api-section-ui')
  flow += '- assertVisible:\n    id: realapps-api-ui\n'
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
} else if (values.mode === 'ios-unavailable') {
  if (values.platform !== 'ios') throw new Error('iOS availability requires iOS')
  tap('realapps-open-api')
  tap('realapps-api-section-ios')
  tap('realapps-api-ios-arrangement')
  visible('.*Swift.ArrangementView requires iOS 27.1 or later.*')
  flow += '- takeScreenshot: arrangement-requires-ios27-1\n'
} else if (values.mode === 'ios') {
  if (values.platform !== 'ios') throw new Error('iOS primitives require iOS')
  tap('realapps-open-api')
  tap('realapps-api-section-ios')
  visible('Matrix SwiftUI text')
  tap('realapps-api-native-button')
  flow += '- takeScreenshot: swiftui-leaves\n'
  scrollTap('realapps-api-glass-toggle')
  if (required.includes('One.iOS.SignInWithAppleButton')) {
    scrollTap('realapps-api-apple-signin')
    visible('You need to sign in to your Apple.Account in Settings.')
    flow += '- takeScreenshot: apple-signin\n'
    flow += '- tapOn: "Close"\n'
  }
  if (required.some((api) => api.startsWith('One.iOS.ZoomTransition'))) {
    scrollTap('realapps-api-zoom-open')
    tap('realapps-api-zoom-back')
  }
  if (required.some((api) => ['One.iOS.Tabs', 'One.iOS.Tab', 'One.iOS.Toolbar', 'One.iOS.ToolbarItem', 'One.iOS.ToolbarItemGroup'].includes(api))) {
    tap('realapps-api-ios-tabs')
    flow += '- tapOn: "Second"\n'
    visible('Second native tab')
    flow += '- tapOn: "First"\n'
    visible('First native tab')
    flow += '- tapOn: "Item hit"\n- tapOn: "Group hit"\n'
  }
  if (required.includes('One.iOS.SplitView')) {
    tap('realapps-api-ios-split')
    tap('realapps-api-split-hit')
    flow += '- takeScreenshot: split-view\n'
  }
  if (required.includes('One.iOS.ArrangementView')) {
    tap('realapps-api-ios-arrangement')
    tap('realapps-api-arrangement-hit')
    visible('Secondary pane')
    flow += '- takeScreenshot: arrangement-view\n'
  }
  if (required.some((api) => ['One.iOS.ToolbarHost', 'One.iOS.BarButtonItem', 'One.iOS.MenuAction'].includes(api))) {
    tap('realapps-api-ios-toolbar')
    flow += '- tapOn: "realapps API bar hit"\n- tapOn: "Menu"\n- tapOn: "Menu hit"\n'
  }
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
  let command = ['maestro', '--device', values.device, 'test', '--test-output-dir', out, path]
  const remoteOut = `/tmp/one-realapps-${process.pid}-${values.mode}`
  if (values.machine) {
    const copied = Bun.spawn(['scp', path, `${values.machine}:${remoteOut}.yaml`], {
      stdout: 'inherit', stderr: 'inherit',
    })
    if (await copied.exited) throw new Error('Could not transfer native UI flow')
    command = [
      'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', values.machine,
      `export PATH="$HOME/.local/share/mise/installs/maestro/cli-2.7.0/bin:$PATH"; maestro --device '${values.device.replace(/'/g, "'\\''")}' test --test-output-dir ${remoteOut} ${remoteOut}.yaml`,
    ]
  }
  const child = Bun.spawn(
    command,
    { stdout: 'inherit', stderr: 'inherit' }
  )
  const deadline = setTimeout(() => child.kill(), 15 * 60 * 1000)
  const status = await child.exited
  clearTimeout(deadline)
  if (values.machine) {
    const copied = Bun.spawn(['scp', '-r', `${values.machine}:${remoteOut}/.`, out], {
      stdout: 'inherit', stderr: 'inherit',
    })
    if (await copied.exited) throw new Error('Could not retain remote native UI proof')
  }
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
    if (values.mode === 'ios-unavailable') {
      const result = results['One.iOS.ArrangementView']
      if (result?.status !== 'failed' ||
          result.value?.message !== 'Swift.ArrangementView requires iOS 27.1 or later')
        throw new Error('Expected exact ArrangementView platform guard')
      writeFileSync(join(out, 'api-availability.json'), JSON.stringify({
        label: 'RAN', api: 'One.iOS.ArrangementView',
        status: 'unavailable', minimumIOS: '27.1', actual: result,
        scope: 'native platform guard exercised; 27.1 rendering remains an open gap',
      }, null, 2) + '\n')
    } else if (failed.length)
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
