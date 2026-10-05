#!/usr/bin/env bun
// Android runtime proof for One.Audio, One.PhotoLibrary, One.Contacts and
// One.Calendar. Installs the prebuilt debug APK on the given emulator,
// drives the four proof screens through real permission dialogs and
// system pickers, and asserts the on-screen result strings.
//
// Usage:
//   bun tests/native-features/scripts/one-native-android-media-proof.ts \
//     --device-id emulator-5560 --apk tests/native-features/android/app/build/outputs/apk/debug/app-debug.apk \
//     [--suite contacts|calendar|photo|audio|all] [--artifact-dir DIR] [--install-only] [--no-install]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PACKAGE = 'dev.vxrn.nativefeatures.tests'
const ADB = process.env.ADB ?? 'adb'

type Args = {
  deviceId: string
  apk: string
  suite: string
  artifactDir: string
  installOnly: boolean
  noInstall: boolean
}

function parse(args: string[]): Args {
  const out: Args = {
    deviceId: '',
    apk: '',
    suite: 'all',
    artifactDir: 'tests/native-features/evidence/one-native-android-media',
    installOnly: false,
    noInstall: false,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--device-id') out.deviceId = args[++i] ?? ''
    else if (arg === '--apk') out.apk = args[++i] ?? ''
    else if (arg === '--suite') out.suite = args[++i] ?? 'all'
    else if (arg === '--artifact-dir') out.artifactDir = args[++i] ?? out.artifactDir
    else if (arg === '--install-only') out.installOnly = true
    else if (arg === '--no-install') out.noInstall = true
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: one-native-android-media-proof.ts --device-id <SERIAL> --apk <APK> [--suite all|contacts|calendar|photo|audio] [--artifact-dir DIR] [--install-only] [--no-install]')
      process.exit(0)
    } else throw new Error(`unknown argument: ${arg}`)
  }
  if (!out.deviceId) throw new Error('--device-id is required')
  if (!out.noInstall && !out.apk) throw new Error('--apk is required unless --no-install')
  return out
}

const config = parse(process.argv.slice(2))
const artifacts = resolve(config.artifactDir)
mkdirSync(artifacts, { recursive: true })

function adb(args: string[], timeout = 60_000): string {
  return execFileSync(ADB, ['-s', config.deviceId, ...args], {
    encoding: 'utf8',
    timeout,
  })
}

function adbQuiet(args: string[]): string {
  try {
    return adb(args)
  } catch (error) {
    return String(error)
  }
}

type Bounds = { left: number; top: number; right: number; bottom: number }
type XmlNode = {
  text: string
  contentDesc: string
  resourceId: string
  className: string
  clickable: boolean
  bounds?: Bounds
}

function parseBounds(value: string | undefined): Bounds | undefined {
  if (!value) return undefined
  const match = value.match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/)
  if (!match) return undefined
  return { left: Number(match[1]), top: Number(match[2]), right: Number(match[3]), bottom: Number(match[4]) }
}

function parseXml(xml: string): XmlNode[] {
  const nodes: XmlNode[] = []
  const pattern = /<node\b([\s\S]*?)\/?>/g
  for (const match of xml.matchAll(pattern)) {
    const raw = match[1]
    const attr = (name: string): string => {
      const found = raw.match(new RegExp(`${name}="([^"]*)"`))
      return found ? found[1] : ''
    }
    nodes.push({
      text: attr('text'),
      contentDesc: attr('content-desc'),
      resourceId: attr('resource-id'),
      className: attr('class'),
      clickable: attr('clickable') === 'true',
      bounds: parseBounds(attr('bounds')),
    })
  }
  return nodes
}

let dumpCount = 0

function dump(saveName?: string): { xml: string; nodes: XmlNode[] } {
  const remote = `/sdcard/one-media-proof-${process.pid}.xml`
  adb(['shell', 'uiautomator', 'dump', remote])
  const xml = adb(['exec-out', 'cat', remote])
  dumpCount += 1
  if (saveName) writeFileSync(resolve(artifacts, saveName), xml)
  return { xml, nodes: parseXml(xml) }
}

function tap(bounds: Bounds) {
  const x = Math.floor((bounds.left + bounds.right) / 2)
  const y = Math.floor((bounds.top + bounds.bottom) / 2)
  adb(['shell', 'input', 'tap', String(x), String(y)])
}

function tapNode(node: XmlNode) {
  if (!node.bounds) throw new Error('cannot tap a node without bounds')
  tap(node.bounds)
}

function findByText(nodes: XmlNode[], text: string): XmlNode | undefined {
  return nodes.find(
    (node) =>
      (node.text === text || node.contentDesc === text) &&
      node.bounds !== undefined
  )
}

function findContaining(nodes: XmlNode[], text: string): XmlNode | undefined {
  return nodes.find(
    (node) =>
      (node.text.includes(text) || node.contentDesc.includes(text)) &&
      node.bounds !== undefined
  )
}

function findByTestId(nodes: XmlNode[], testId: string): XmlNode | undefined {
  return nodes.find(
    (node) =>
      node.resourceId === testId ||
      node.resourceId.endsWith(`/${testId}`) ||
      node.resourceId.endsWith(`:id/${testId}`) ||
      node.contentDesc === testId
  )
}

function screenText(nodes: XmlNode[]): string {
  return nodes.map((node) => node.text || node.contentDesc).filter(Boolean).join('\n')
}

function assertNoRedBox(nodes: XmlNode[]) {
  const joined = screenText(nodes)
  if (/redbox|unable to resolve module|invariant violation|fatal exception|syntaxerror|typeerror/i.test(joined)) {
    throw new Error(`the app is showing a RedBox: ${joined.slice(0, 2000)}`)
  }
  if (/\breload\b/i.test(joined) && /\bdismiss\b/i.test(joined)) {
    throw new Error(`the app is showing a RedBox: ${joined.slice(0, 2000)}`)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// permission dialog policies: tap the full-grant option, the limited
// option, or deny.
type DialogPolicy = 'allow' | 'limited' | 'deny'

function handlePermissionDialog(nodes: XmlNode[], policy: DialogPolicy): boolean {
  const allowFull = ['Allow all', 'While using the app', 'Allow']
  const allowLimited = ['Select photos and videos', 'Allow limited access', 'Select more']
  const deny = ["Don't allow", 'Deny']
  if (policy === 'deny') {
    for (const label of deny) {
      const node = findByText(nodes, label)
      if (node?.clickable && node.bounds) {
        tapNode(node)
        return true
      }
    }
    return false
  }
  const labels = policy === 'limited' ? [...allowLimited, ...deny] : [...allowFull, ...deny.slice(0, 0)]
  for (const label of labels) {
    const node = findByText(nodes, label)
    if (node?.clickable && node.bounds) {
      tapNode(node)
      return true
    }
  }
  return false
}

function dialogVisible(nodes: XmlNode[]): boolean {
  return nodes.some((node) =>
    /^(Allow all|Allow limited access|Allow|While using the app|Select photos and videos|Select more|Don't allow|Deny)$/.test(
      node.text
    )
  )
}

async function waitFor(
  match: (nodes: XmlNode[]) => boolean,
  options: { timeoutMs: number; dialogPolicy?: DialogPolicy; onDump?: (nodes: XmlNode[]) => Promise<void> | void }
): Promise<XmlNode[]> {
  const deadline = Date.now() + options.timeoutMs
  let last: XmlNode[] = []
  while (Date.now() < deadline) {
    const { nodes } = dump()
    last = nodes
    assertNoRedBox(nodes)
    if (match(nodes)) return nodes
    if (options.onDump) await options.onDump(nodes)
    if (options.dialogPolicy && dialogVisible(nodes)) {
      handlePermissionDialog(nodes, options.dialogPolicy)
    }
    await sleep(1000)
  }
  throw new Error(`timed out waiting for condition. last screen:\n${screenText(last).slice(0, 3000)}`)
}

function launch(route: string) {
  adb(['shell', 'am', 'force-stop', PACKAGE])
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `nativefeatures://app/${route}`])
}

async function tapTestIdOrText(testId: string, text: string, timeoutMs = 30_000) {
  const nodes = await waitFor(
    (current) => findByTestId(current, testId) !== undefined || findByText(current, text) !== undefined,
    { timeoutMs }
  )
  const target = findByTestId(nodes, testId) ?? findByText(nodes, text)
  if (!target?.bounds) throw new Error(`no tappable target for ${testId}`)
  // the testID node may be the label; prefer the clickable ancestor, else tap center.
  tapNode(target.clickable ? target : { ...target })
}

function resultLine(nodes: XmlNode[], prefix: string): string {
  const node = nodes.find(
    (entry) => entry.text.startsWith(prefix) || entry.contentDesc.startsWith(prefix)
  )
  return node ? node.text || node.contentDesc : ''
}

function check(name: string, actual: string, expected: string | RegExp) {
  const pass = typeof expected === 'string' ? actual.includes(expected) : expected.test(actual)
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${actual.slice(0, 400)}`)
  if (!pass) throw new Error(`check failed: ${name} (expected ${expected}, got ${actual.slice(0, 400)})`)
}

async function installAndSeed() {
  console.log(`installing ${config.apk}`)
  adb(['install', '-r', '-d', config.apk], 180_000)
  adb(['shell', 'pm', 'clear', PACKAGE])
  // grant everything for seeding, then revoke back to a fresh state.
  for (const perm of ['READ_CALENDAR', 'WRITE_CALENDAR', 'READ_CONTACTS', 'WRITE_CONTACTS']) {
    adbQuiet(['shell', 'pm', 'grant', PACKAGE, `android.permission.${perm}`])
  }
  seedLocalCalendar()
  seedPhotos()
  for (const perm of [
    'READ_CALENDAR',
    'WRITE_CALENDAR',
    'READ_CONTACTS',
    'WRITE_CONTACTS',
    'READ_MEDIA_IMAGES',
    'READ_MEDIA_VIDEO',
    'READ_EXTERNAL_STORAGE',
  ]) {
    adbQuiet(['shell', 'pm', 'revoke', PACKAGE, `android.permission.${perm}`])
  }
  adb(['shell', 'pm', 'clear', PACKAGE])
}

function seedLocalCalendar() {
  // a fresh emulator has no writable calendar; insert a local one as the
  // app identity so the calendar proof has a creation target.
  const existing = adbQuiet([
    'shell',
    'run-as',
    PACKAGE,
    '/system/bin/content',
    'query',
    '--uri',
    'content://com.android.calendar/calendars',
    '--projection',
    '_id',
  ])
  if (/Row: 0 /.test(existing)) {
    console.log('calendar seed: a calendar already exists')
    return
  }
  const out = adb([
    'shell',
    'run-as',
    PACKAGE,
    '/system/bin/content',
    'insert',
    '--uri',
    'content://com.android.calendar/calendars',
    '--bind',
    'name:s:OneProof',
    '--bind',
    'account_name:s:oneproof',
    '--bind',
    'account_type:s:LOCAL',
    '--bind',
    'calendar_displayName:s:OneProof',
    '--bind',
    'calendar_color:i:-14575885',
    '--bind',
    'calendar_access_level:i:700',
    '--bind',
    'ownerAccount:s:oneproof',
    '--bind',
    'visible:i:1',
    '--bind',
    'sync_events:i:1',
  ])
  console.log(`calendar seed: ${out.trim()}`)
  writeFileSync(resolve(artifacts, 'calendar-seed.txt'), out)
}

// a 1x1 green png; pushed straight to shared storage for the limited
// picker legs and the seeded-old-id control.
const SEED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function seedPhotos() {
  const seedPath = resolve(artifacts, 'seed.png')
  writeFileSync(seedPath, Buffer.from(SEED_PNG_BASE64, 'base64'))
  for (const name of ['one-seed-1.png', 'one-seed-2.png', 'one-seed-3.png']) {
    adb(['push', seedPath, `/sdcard/Pictures/${name}`])
  }
  adbQuiet([
    'shell',
    'am',
    'broadcast',
    '-a',
    'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
    '-d',
    'file:///sdcard/Pictures/one-seed-1.png',
  ])
  console.log('photo seed: pushed 3 pngs to Pictures')
}

async function suiteContacts() {
  console.log('--- contacts ---')
  launch('one-native-contacts')
  await tapTestIdOrText('one-native-contacts-run', 'Run Contacts proof')
  const nodes = await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined || findContaining(current, 'Status: failed') !== undefined,
    {
      timeoutMs: 180_000,
      dialogPolicy: 'allow',
      onDump: async (current) => {
        const stage = resultLine(current, 'Picker stage: ')
        if (stage.includes('selecting')) {
          // tap the proof contact the fixture just created.
          const contact = findContaining(current, 'OneEdited')
          if (contact?.bounds) tapNode(contact)
        } else if (stage.includes('swiping') || stage.includes('afterSwipe')) {
          adbQuiet(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
          await sleep(1500)
        }
      },
    }
  )
  dump('contacts-final.xml')
  const status = resultLine(nodes, 'Status: ')
  const result = resultLine(nodes, 'Result: ')
  const address = resultLine(nodes, 'Address: ')
  const picker = resultLine(nodes, 'Picker: ')
  check('contacts status', status, 'Status: passed')
  check('contacts denial before grant', result, 'before=E_CONTACTS_PERMISSION')
  check('contacts crud', result, 'matched=true')
  check('contacts deleted', result, 'removed=true')
  check('contacts not found', result, 'missingDelete=E_CONTACTS_NOT_FOUND')
  check('contacts address', address, 'created=true')
  check('contacts picker', picker, 'selected=true')
}

async function suiteCalendar() {
  console.log('--- calendar ---')
  launch('one-native-calendar')
  await tapTestIdOrText('one-native-calendar-run', 'Run Calendar proof')
  const nodes = await waitFor(
    (current) => findContaining(current, 'Status: done') !== undefined || findContaining(current, 'Status: failed') !== undefined,
    { timeoutMs: 180_000, dialogPolicy: 'allow' }
  )
  dump('calendar-final.xml')
  const status = resultLine(nodes, 'Status: ')
  const result = resultLine(nodes, 'Result: ')
  check('calendar status', status, 'Status: done')
  check('calendar denial before grant', result, 'before=E_CALENDAR_PERMISSION')
  for (const field of ['matched=true', 'updated=true', 'removed=true', 'recurrenceListed=true', 'recurrenceRemoved=true', 'dateBounded=true', 'dateRemoved=true']) {
    check(`calendar ${field}`, result, field)
  }
  for (const field of ['notFound=E_CALENDAR_NOT_FOUND', 'invalidUpdate=E_CALENDAR_INPUT', 'invalid=E_CALENDAR_INPUT', 'invalidRecurrence=E_CALENDAR_INPUT', 'invalidRecurrenceEnd=E_CALENDAR_INPUT']) {
    check(`calendar ${field}`, result, field)
  }
  // reminders stay honestly unavailable on Android.
  await tapTestIdOrText('one-native-reminders-run', 'Run Reminders proof')
  const reminderNodes = await waitFor(
    (current) => screenText(current).includes('denied') || screenText(current).includes('Reminder Status:'),
    { timeoutMs: 60_000 }
  )
  dump('calendar-reminders-final.xml')
  check('calendar reminders denied', screenText(reminderNodes), 'denied')
}

async function suitePhoto() {
  console.log('--- photo ---')
  launch('one-native-photo-library')
  await tapTestIdOrText('one-native-photo-library-run', 'Save image and video to Photos')
  let nodes = await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined || findContaining(current, 'Status: error') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow' }
  )
  check('photo save', resultLine(nodes, 'Status: '), 'Status: passed')
  check('photo save result', resultLine(nodes, 'Result: '), 'uri=E_PHOTO_LIBRARY_URI')

  await tapTestIdOrText('one-native-photo-library-read', 'Read saved Photos assets')
  nodes = await waitFor(
    (current) => findContaining(current, 'Status: read-passed') !== undefined || findContaining(current, 'Status: read-error') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow' }
  )
  check('photo read', resultLine(nodes, 'Status: '), 'Status: read-passed')
  const readResult = resultLine(nodes, 'Read result: ')
  for (const field of ['listed=true', 'invalid=E_PHOTO_LIBRARY_INPUT', 'missing=E_PHOTO_LIBRARY_NOT_FOUND', 'originalImage=true', 'originalVideo=true', 'exportInvalid=E_PHOTO_LIBRARY_INPUT', 'exportMissing=E_PHOTO_LIBRARY_NOT_FOUND']) {
    check(`photo ${field}`, readResult, field)
  }

  await tapTestIdOrText('one-native-photo-library-unavailable', 'Check unavailable Photos methods')
  nodes = await waitFor(
    (current) => findContaining(current, 'Status: unavailable-passed') !== undefined || findContaining(current, 'Status: unavailable-') !== undefined,
    { timeoutMs: 60_000 }
  )
  check('photo unavailable', resultLine(nodes, 'Status: '), 'Status: unavailable-passed')

  await tapTestIdOrText('one-native-photo-library-manage', 'Favorite and delete Photos assets')
  nodes = await waitFor(
    (current) => findContaining(current, 'Status: manage-passed') !== undefined || findContaining(current, 'Status: manage-error') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow' }
  )
  check('photo manage', resultLine(nodes, 'Status: '), 'Status: manage-passed')
  const manageResult = resultLine(nodes, 'Manage result: ')
  for (const field of ['favorite=true', 'restored=false', 'invalid=E_PHOTO_LIBRARY_INPUT', 'missing=E_PHOTO_LIBRARY_NOT_FOUND', 'deleted=E_PHOTO_LIBRARY_NOT_FOUND', 'preserved=true']) {
    check(`photo ${field}`, manageResult, field)
  }
  dump('photo-final.xml')

  // limited legs need a fresh limited grant: revoke, relaunch, save again,
  // then walk the limited request and reshow with real selections.
  console.log('--- photo limited ---')
  for (const perm of ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_EXTERNAL_STORAGE']) {
    adbQuiet(['shell', 'pm', 'revoke', PACKAGE, `android.permission.${perm}`])
  }
  adb(['shell', 'pm', 'clear', PACKAGE])
  launch('one-native-photo-library')
  await tapTestIdOrText('one-native-photo-library-run', 'Save image and video to Photos')
  await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow' }
  )
  await tapTestIdOrText('one-native-photo-library-limited-request', 'Request limited Photos access')
  await waitFor(
    (current) => findContaining(current, 'Status: limited-ready') !== undefined || findContaining(current, 'Status: limited-error') !== undefined,
    {
      timeoutMs: 180_000,
      onDump: async (current) => {
        if (dialogVisible(current)) {
          handlePermissionDialog(current, 'limited')
          return
        }
        // system photo picker selection: tap the first photo, then Add.
        if (findByText(current, 'Add')?.clickable) {
          const grid = current.filter(
            (node) => node.className.includes('ImageView') && node.clickable && node.bounds
          )
          if (grid.length > 0) {
            tapNode(grid[0])
            await sleep(1000)
          }
          const add = findByText(current, 'Add')
          if (add?.bounds) tapNode(add)
        }
      },
    }
  )
  nodes = dump('photo-limited-ready.xml').nodes
  check('photo limited ready', resultLine(nodes, 'Status: '), 'Status: limited-ready')

  await tapTestIdOrText('one-native-photo-library-limited-pick', 'Choose more Photos assets')
  nodes = await waitFor(
    (current) => findContaining(current, 'Status: limited-passed') !== undefined || findContaining(current, 'Status: limited-error') !== undefined,
    {
      timeoutMs: 180_000,
      onDump: async (current) => {
        if (findByText(current, 'Add')?.clickable) {
          const grid = current.filter(
            (node) => node.className.includes('ImageView') && node.clickable && node.bounds
          )
          for (const pick of grid.slice(0, 2)) {
            tapNode(pick)
            await sleep(500)
          }
          const add = findByText(current, 'Add')
          if (add?.bounds) tapNode(add)
        }
      },
    }
  )
  dump('photo-limited-final.xml')
  check('photo limited passed', resultLine(nodes, 'Status: '), 'Status: limited-passed')
  const limited = resultLine(nodes, 'Limited result: ')
  for (const field of ['readable=true', 'preserved=true', 'distinct=true', 'strict=true']) {
    check(`photo limited ${field}`, limited, field)
  }
}

async function suiteAudio() {
  console.log('--- audio ---')
  launch('one-native-audio')
  await tapTestIdOrText('one-native-audio-run', 'Record and play')
  let nodes = await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined || findContaining(current, 'Status: error') !== undefined,
    { timeoutMs: 180_000, dialogPolicy: 'allow' }
  )
  check('audio run', resultLine(nodes, 'Status: '), 'Status: passed')
  check('audio errors', resultLine(nodes, 'Result: '), 'errors=E_AUDIO_URI,E_AUDIO_STATE,E_AUDIO_STATE')

  // background: start playback, home for 32s, return, check advancement.
  await tapTestIdOrText('one-native-audio-background-start', 'Start background playback')
  await waitFor((current) => screenText(current).includes('Background: ready:'), {
    timeoutMs: 60_000,
  })
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME'])
  await sleep(32_000)
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'nativefeatures://app/one-native-audio'])
  await tapTestIdOrText('one-native-audio-background-check', 'Check background playback')
  nodes = await waitFor(
    (current) => screenText(current).includes('Background: passed:') || screenText(current).includes('Background: error:'),
    { timeoutMs: 60_000 }
  )
  check('audio background', screenText(nodes), 'Background: passed:')

  // interruption: real focus loss via a simulated gsm call.
  await tapTestIdOrText('one-native-audio-interruption-start', 'Start interruption playback')
  await waitFor((current) => screenText(current).includes('Interruption: ready'), {
    timeoutMs: 60_000,
  })
  adb(['emu', 'gsm', 'call', '+15551234567'])
  nodes = await waitFor((current) => screenText(current).includes('began:false'), {
    timeoutMs: 60_000,
  })
  adb(['emu', 'gsm', 'cancel', '+15551234567'])
  nodes = await waitFor((current) => screenText(current).includes('ended:true'), {
    timeoutMs: 60_000,
  })
  check('audio interruption events', screenText(nodes), 'began:false')
  await tapTestIdOrText('one-native-audio-interruption-check', 'Check interruption playback')
  nodes = await waitFor((current) => screenText(current).includes('Interruption playback: paused'), {
    timeoutMs: 60_000,
  })
  check('audio interruption paused', screenText(nodes), 'Interruption playback: paused')

  // remote commands via media keys to the active session.
  await tapTestIdOrText('one-native-audio-remote-start', 'Start remote playback')
  nodes = await waitFor(
    (current) => screenText(current).includes('Remote: ready') || screenText(current).includes('Remote: error'),
    { timeoutMs: 60_000 }
  )
  check('audio remote ready', screenText(nodes), 'Remote: ready')
  check('audio remote errors', screenText(nodes), 'E_AUDIO_STATE,E_AUDIO_METADATA,E_AUDIO_ARTWORK')
  adb(['shell', 'input', 'keyevent', 'KEYCODE_MEDIA_PAUSE'])
  await waitFor((current) => screenText(current).includes('Remote event: pause:'), {
    timeoutMs: 30_000,
  })
  await tapTestIdOrText('one-native-audio-remote-check', 'Check remote playback')
  await waitFor((current) => screenText(current).includes('Remote playback: paused:1'), {
    timeoutMs: 30_000,
  })
  adb(['shell', 'input', 'keyevent', 'KEYCODE_MEDIA_PLAY'])
  await waitFor((current) => screenText(current).includes('Remote event: play:'), {
    timeoutMs: 30_000,
  })
  await tapTestIdOrText('one-native-audio-remote-check', 'Check remote playback')
  nodes = await waitFor((current) => screenText(current).includes('Remote playback: playing:2'), {
    timeoutMs: 30_000,
  })
  await tapTestIdOrText('one-native-audio-remote-clear', 'Clear remote controls')
  nodes = await waitFor((current) => screenText(current).includes('Remote: cleared'), {
    timeoutMs: 30_000,
  })
  dump('audio-final.xml')
  check('audio remote cleared', screenText(nodes), 'Remote: cleared')
}

async function main() {
  if (!config.noInstall) {
    await installAndSeed()
  }
  if (config.installOnly) {
    console.log('install-only done')
    return
  }
  const suites = config.suite === 'all' ? ['contacts', 'calendar', 'photo', 'audio'] : [config.suite]
  for (const suite of suites) {
    if (suite === 'contacts') await suiteContacts()
    else if (suite === 'calendar') await suiteCalendar()
    else if (suite === 'photo') await suitePhoto()
    else if (suite === 'audio') await suiteAudio()
    else throw new Error(`unknown suite: ${suite}`)
  }
  console.log('ALL MEDIA SUITES PASSED')
}

main().catch((error) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`)
  try {
    dump('failure-final.xml')
  } catch {}
  process.exit(1)
})
