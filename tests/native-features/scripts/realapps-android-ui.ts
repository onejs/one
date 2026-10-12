import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    device: { type: 'string' },
    'package-root': { type: 'string' },
    text: { type: 'string' },
    out: { type: 'string' },
  },
  strict: true,
})
if (!values.device || !values['package-root'] || !values.text || !values.out)
  throw new Error('Expected --device --package-root --text --out')
const adb = (args: string[]) =>
  execFileSync('adb', ['-s', values.device!, ...args], { encoding: 'utf8' })
const build = readFileSync(
  join(values['package-root'], 'android/app/build.gradle'),
  'utf8'
)
const packageId = build.match(/applicationId\s+["']([^"']+)/)?.[1]
if (!packageId) throw new Error('No applicationId in generated Android project')
const activity = adb(['shell', 'dumpsys', 'activity', 'activities'])
writeFileSync(join(values.out, 'android-activity.txt'), activity)
if (!activity.includes(packageId))
  throw new Error(`App ${packageId} is not in the activity stack`)
const flow = join(values.out, 'android-launch.yaml')
writeFileSync(
  flow,
  `appId: ${packageId}\n---\n- launchApp:\n    permissions:\n      all: allow\n- extendedWaitUntil:\n    visible: ${JSON.stringify(values.text)}\n    timeout: 60000\n- assertVisible: ${JSON.stringify(values.text)}\n`
)
execFileSync('maestro', ['--device', values.device, 'test', flow], { stdio: 'inherit' })
adb(['shell', 'uiautomator', 'dump', '/sdcard/one-realapps-ui.xml'])
const tree = adb(['shell', 'cat', '/sdcard/one-realapps-ui.xml'])
writeFileSync(join(values.out, 'android-ui.xml'), tree)
writeFileSync(
  join(values.out, 'android.png'),
  execFileSync('adb', ['-s', values.device, 'exec-out', 'screencap', '-p'])
)
writeFileSync(join(values.out, 'android-logcat.txt'), adb(['logcat', '-d', '-t', '2000']))
if (!tree.includes(values.text))
  throw new Error(
    `Expected visible app text ${JSON.stringify(values.text)} in accessibility tree`
  )
if (/Unable to resolve|No script URL|Render Error|SyntaxError/.test(tree))
  throw new Error('The app shows an error instead of the original UI')
console.log(`RAN ${packageId}: visible ${JSON.stringify(values.text)}`)
