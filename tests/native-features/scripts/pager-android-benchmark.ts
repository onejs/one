import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

// uiautomator waits for native idle before each assertion and next gesture.
const [serial, output] = process.argv.slice(2)
if (!serial || !output) {
  throw new Error('usage: pager-android-benchmark.ts <adb serial> <output.json>')
}
const adbPath = process.env.ADB_PATH ?? 'adb'
function adb(...args: string[]) {
  return execFileSync(adbPath, ['-s', serial!, ...args], { encoding: 'utf8' })
}
function snapshot() {
  adb('shell', 'rm', '-f', '/sdcard/one-pager-benchmark.xml')
  adb('shell', 'uiautomator', 'dump', '/sdcard/one-pager-benchmark.xml')
  const xml = adb('exec-out', 'cat', '/sdcard/one-pager-benchmark.xml')
  return [...xml.matchAll(/<node\s+((?:[^>"']|"[^"]*"|'[^']*')+)>/g)].map((match) =>
    Object.fromEntries([...match[1]!.matchAll(/([\w-]+)=(["'])(.*?)\2/g)].map((attribute) => [
      attribute[1], attribute[3]!.replaceAll('&quot;', '"').replaceAll('&amp;', '&'),
    ])),
  )
}
function target(identifier: string) {
  const nodes = snapshot()
  const node = nodes.find((value) => value['resource-id']?.endsWith(identifier))
  if (!node) throw new Error(`missing native target ${identifier}: ${JSON.stringify(nodes.filter((node) => node.text || node['resource-id']))}`)
  const bounds = node.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)
  if (!bounds) throw new Error(`invalid native bounds: ${JSON.stringify(node)}`)
  const [left, top, right, bottom] = bounds.slice(1).map(Number)
  return { left: left!, top: top!, right: right!, bottom: bottom! }
}
function tap(identifier: string) {
  const bounds = target(identifier)
  adb('shell', 'input', 'tap',
    String(Math.round((bounds.left + bounds.right) / 2)),
    String(Math.round((bounds.top + bounds.bottom) / 2)))
}
function assertText(text: string) {
  const nodes = snapshot()
  if (!nodes.some((node) => node.text === text)) {
    throw new Error(`expected ${text}: ${JSON.stringify(nodes.filter((node) => node.text || node['resource-id']))}`)
  }
}
const measurements: Record<string, unknown>[] = []
let activeComponent = snapshot().find((node) =>
  node.text === 'One.UI.Pager' || node.text === 'pager-view 8.0.5')?.text
if (!activeComponent) throw new Error('pager fixture is not ready')
// counterbalance the order so later host rendering changes cannot favor one pager.
for (let sample = 0; sample < 7; sample++) {
  const components = sample % 2 === 0
    ? ['One.UI.Pager', 'pager-view 8.0.5']
    : ['pager-view 8.0.5', 'One.UI.Pager']
  for (const component of components) {
    if (activeComponent !== component) tap('one-ui-pager-baseline')
    activeComponent = component
    assertText(component)
    tap('one-ui-pager-instant-2')
    assertText('selected:2')
    assertText('page 2')
    assertText('state:idle')
    tap('one-ui-pager-reset-stats')
    assertText('ready')
    adb('shell', 'dumpsys', 'gfxinfo', 'dev.vxrn.nativefeatures.tests', 'reset')
    const bounds = target('one-ui-pager-stage')
    const width = bounds.right - bounds.left
    // keep the gesture clear of the centered keyboard probe.
    const y = Math.round(bounds.top + (bounds.bottom - bounds.top) * 0.25)
    adb('shell', 'input', 'swipe',
      String(Math.round(bounds.left + width * 0.15)), String(y),
      String(Math.round(bounds.left + width * 0.85)), String(y), '1000')
    writeFileSync(output.replace(/\.json$/, `-${component === 'One.UI.Pager' ? 'one' : 'rival'}-${sample}-frames.txt`), adb('shell', 'dumpsys', 'gfxinfo', 'dev.vxrn.nativefeatures.tests', 'framestats'))
    assertText('selected:1')
    assertText('state:idle')
    tap('one-ui-pager-report')
    const deadline = Date.now() + 15000
    let reportText: string | undefined
    while (Date.now() < deadline) {
      reportText = snapshot().find((node) => node.text?.startsWith('{"component":'))?.text
      if (reportText) break
    }
    if (!reportText) throw new Error('missing native benchmark report')
    const report = JSON.parse(reportText)
    if (report.component !== component || report.events < 20 ||
        !report.fractional || report.progress !== 1 || report.meanUs <= 0) {
      throw new Error(`invalid drag measurement: ${JSON.stringify(report)}`)
    }
    measurements.push({ sample, ...report })
    writeFileSync(output, JSON.stringify({ serial, duration: 1, distance: 0.7, measurements }, null, 2) + '\n')
    console.log(JSON.stringify({ sample, ...report }))
    writeFileSync(output.replace(/\.json$/, component === 'One.UI.Pager' ? '-one.png' : '-pager-view.png'),
      execFileSync(adbPath, ['-s', serial, 'exec-out', 'screencap', '-p']))
  }
}
