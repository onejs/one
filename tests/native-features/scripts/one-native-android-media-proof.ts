#!/usr/bin/env bun
// Android runtime proof for One.Audio, One.PhotoLibrary, One.Contacts and
// One.Calendar. Installs the prebuilt debug APK on the given emulator,
// drives the four proof screens through real permission dialogs and
// system pickers, and asserts the on-screen result strings.
//
// Usage:
//   bun tests/native-features/scripts/one-native-android-media-proof.ts \
//     --device-id emulator-5560 --apk tests/native-features/android/app/build/outputs/apk/debug/app-debug.apk \
//     [--suite contacts|calendar|photo|audio|all] [--artifact-dir DIR] [--metro-port PORT] [--install-only] [--no-install]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stampAndroidDebugHost } from './android-debug-host'

const PACKAGE = 'dev.vxrn.nativefeatures.tests'
const ADB = process.env.ADB ?? 'adb'

type Args = {
  deviceId: string
  apk: string
  suite: string
  artifactDir: string
  installOnly: boolean
  noInstall: boolean
  metroPort: number
}

function parse(args: string[]): Args {
  const out: Args = {
    deviceId: '',
    apk: '',
    suite: 'all',
    artifactDir: 'tests/native-features/evidence/one-native-android-media',
    installOnly: false,
    noInstall: false,
    metroPort: 8081,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--device-id') out.deviceId = args[++i] ?? ''
    else if (arg === '--apk') out.apk = args[++i] ?? ''
    else if (arg === '--metro-port') out.metroPort = Number(args[++i])
    else if (arg === '--suite') out.suite = args[++i] ?? 'all'
    else if (arg === '--artifact-dir') out.artifactDir = args[++i] ?? out.artifactDir
    else if (arg === '--install-only') out.installOnly = true
    else if (arg === '--no-install') out.noInstall = true
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: one-native-android-media-proof.ts --device-id <SERIAL> --apk <APK> [--suite all|contacts|calendar|photo|audio] [--artifact-dir DIR] [--metro-port PORT] [--install-only] [--no-install]')
      process.exit(0)
    } else throw new Error(`unknown argument: ${arg}`)
  }
  if (!out.deviceId) throw new Error('--device-id is required')
  if (!out.noInstall && !out.apk) throw new Error('--apk is required unless --no-install')
  if (!Number.isInteger(out.metroPort) || out.metroPort <= 0 || out.metroPort > 65535) {
    throw new Error('a valid Metro port is required: --metro-port <PORT>')
  }
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
  try {
    adb(['shell', 'uiautomator', 'dump', remote])
  } catch (error) {
    // the on-device dumpler flakes under load; one immediate retry
    // separates observation noise from a wedged screen.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000)
    adb(['shell', 'uiautomator', 'dump', remote])
  }
  const xml = adb(['exec-out', 'cat', remote])
  dumpCount += 1
  writeFileSync(resolve(artifacts, saveName ?? `dump-${String(dumpCount).padStart(3, '0')}.xml`), xml)
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

function photoPickerConfirm(nodes: XmlNode[]): XmlNode | undefined {
  // the system selection grid confirms with Add on older releases and
  // Done on newer ones; uiautomator reports system nodes as
  // non-clickable, so match on bounds and tap by coordinates.
  return findByText(nodes, 'Add') ?? findByText(nodes, 'Done') ?? findByText(nodes, 'Save')
}

function photoPickerItems(nodes: XmlNode[]): XmlNode[] {
  // grid items carry photo/video content descriptions; the standalone
  // 'Selected' badge views are not items.
  return nodes.filter(
    (node) =>
      node.bounds !== undefined &&
      /photo taken|video taken/i.test(node.contentDesc) &&
      !/^selected$/i.test(node.contentDesc.trim())
  )
}

function unselectedPickerItems(nodes: XmlNode[]): XmlNode[] {
  // items tucked under the bottom confirm bar never toggle, so only
  // fully visible rows count; the caller scrolls when none qualify.
  return photoPickerItems(nodes).filter(
    (node) =>
      !/^selected\s/i.test(node.contentDesc) &&
      node.bounds !== undefined &&
      (node.bounds.top + node.bounds.bottom) / 2 < 2000
  )
}

function selectedPickerCount(nodes: XmlNode[]): number {
  return photoPickerItems(nodes).filter((node) => /^selected\s/i.test(node.contentDesc)).length
}

function swipeUp(nodes: XmlNode[]) {
  const items = photoPickerItems(nodes).filter((node) => node.bounds !== undefined)
  if (items.length < 2) return
  const tops = items.map((node) => node.bounds!.top).sort((a, b) => a - b)
  const lefts = items.map((node) => node.bounds!.left).sort((a, b) => a - b)
  const x = Math.floor((lefts[0] + lefts[lefts.length - 1]) / 2)
  adb(['shell', 'input', 'swipe', String(x), String(tops[tops.length - 1]), String(x), String(tops[0]), '400'])
}

function appHomeVisible(nodes: XmlNode[]): boolean {
  return findContaining(nodes, 'Status: ') !== undefined
}

function settingsMarkersVisible(nodes: XmlNode[]): boolean {
  return (
    findByText(nodes, 'Permissions') !== undefined ||
    findByText(nodes, 'Photos and videos') !== undefined ||
    findByText(nodes, 'Always allow all') !== undefined ||
    findByText(nodes, 'Allow limited access') !== undefined ||
    findByText(nodes, 'App info') !== undefined ||
    findByText(nodes, 'App permissions') !== undefined ||
    findByText(nodes, 'Allowed') !== undefined ||
    findByText(nodes, 'Not allowed') !== undefined
  )
}

let screenHeight = 0
function settingsScroll() {
  // the permissions list pushes revoked rows below the fold, so
  // forward navigation scrolls when its row is not laid out.
  if (screenHeight <= 0) {
    const size = adb(['shell', 'wm', 'size']).match(/(\d+)x(\d+)/)
    screenHeight = size !== null ? Number(size[2]) : 2400
  }
  const top = Math.floor(screenHeight * 0.3)
  adb(['shell', 'input', 'swipe', '540', String(screenHeight - top), '540', String(top), '400'])
}

function photosRadioPage(nodes: XmlNode[]): boolean {
  // settings offers no direct photos-permission page, so the reshow
  // walks app info -> permissions -> photos and revokes there; the
  // radio labels below are the aosp settings strings on the test box.
  // the trailing link tells the page apart from the permission dialog,
  // which offers the same three options without it.
  const texts = nodes.map((node) => norm(node.text))
  return (
    texts.includes('Always allow all') &&
    texts.includes('Allow limited access') &&
    texts.includes("Don't allow") &&
    texts.some((text) => text.includes('See all apps with this permission'))
  )
}

function photoGrantRevoked(): boolean {
  const dump = adb(['shell', 'dumpsys', 'package', PACKAGE])
  return (
    /READ_MEDIA_IMAGES: granted=false/.test(dump) &&
    /READ_MEDIA_VIDEO: granted=false/.test(dump) &&
    /READ_MEDIA_VISUAL_USER_SELECTED: granted=false/.test(dump)
  )
}

function tapSettingsRow(nodes: XmlNode[], label: string): boolean {
  const row = findByText(nodes, label)
  if (row === undefined) return false
  tapNode(row)
  return true
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
// option, or deny. system buttons use a curly apostrophe in Dont allow.
type DialogPolicy = 'allow' | 'limited' | 'deny'

function norm(text: string): string {
  return text.replace(/[’‘]/g, "'")
}

function tapButton(nodes: XmlNode[], labels: string[]): boolean {
  for (const label of labels) {
    const node = nodes.find(
      (entry) =>
        norm(entry.text) === label || norm(entry.contentDesc) === label
    )
    if (node?.clickable && node.bounds) {
      tapNode(node)
      return true
    }
  }
  return false
}

const DENY_LABELS = ["Don't allow", 'Deny']

function handlePermissionDialog(
  nodes: XmlNode[],
  policy: DialogPolicy,
  serviceKeywords: string[] = []
): boolean {
  // unrelated launch-time prompts (nearby devices and the like) are
  // denied; only the awaited service dialog follows the policy.
  const title = nodes.find((node) => /^Allow .* to /.test(node.text))?.text.toLowerCase() ?? ''
  const isServiceDialog =
    serviceKeywords.length === 0 || serviceKeywords.some((word) => title.includes(word))
  if (!isServiceDialog) return tapButton(nodes, DENY_LABELS)
  if (policy === 'deny') return tapButton(nodes, DENY_LABELS)
  if (policy === 'limited') {
    return tapButton(nodes, ['Select photos and videos', 'Allow limited access', 'Select more'])
  }
  return tapButton(nodes, ['Allow all', 'While using the app', 'Allow'])
}

function dialogVisible(nodes: XmlNode[]): boolean {
  return nodes.some((node) =>
    /^(Allow all|Allow limited access|Allow|While using the app|Select photos and videos|Select more|Don't allow|Deny)$/.test(
      norm(node.text)
    )
  )
}

async function waitFor(
  match: (nodes: XmlNode[]) => boolean,
  options: {
    timeoutMs: number
    dialogPolicy?: DialogPolicy
    serviceKeywords?: string[]
    onDump?: (nodes: XmlNode[]) => Promise<void> | void
  }
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
      handlePermissionDialog(nodes, options.dialogPolicy, options.serviceKeywords)
    }
    await sleep(1000)
  }
  throw new Error(`timed out waiting for condition. last screen:\n${screenText(last).slice(0, 3000)}`)
}

function launch(route: string, revoke: string[] = []) {
  adb(['shell', 'pm', 'clear', PACKAGE])
  for (const perm of revoke) {
    adbQuiet(['shell', 'pm', 'revoke', PACKAGE, `android.permission.${perm}`])
  }
  stampAndroidDebugHost(PACKAGE, config.metroPort, adb)
  adb(['shell', 'am', 'force-stop', PACKAGE])
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `nativefeatures://app/${route}`])
}

async function tapTestIdOrText(testId: string, text: string, timeoutMs = 30_000) {
  const nodes = await waitFor(
    (current) => findByTestId(current, testId) !== undefined || findByText(current, text) !== undefined,
    // pre-run waits only ever meet unrelated launch-time prompts: deny them.
    { timeoutMs, dialogPolicy: 'deny' }
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
  // a fresh emulator has no writable calendar; insert a local one via the
  // shell identity (appops-granted, sync-adapter URI) so the calendar
  // proof has a creation target.
  adbQuiet(['shell', 'cmd', 'appops', 'set', '--uid', '2000', 'READ_CALENDAR', 'allow'])
  adbQuiet(['shell', 'cmd', 'appops', 'set', '--uid', '2000', 'WRITE_CALENDAR', 'allow'])
  const existing = adbQuiet([
    'shell',
    'content',
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
    'content',
    'insert',
    '--uri',
    // quoted for the on-device shell, which would otherwise split on &.
    "'content://com.android.calendar/calendars?caller_is_syncadapter=true&account_name=oneproof&account_type=LOCAL'",
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

function resetContacts() {
  // stale proof contacts would confuse the picker tap: wipe the book.
  adbQuiet(['shell', 'cmd', 'appops', 'set', '--uid', '2000', 'READ_CONTACTS', 'allow'])
  adbQuiet(['shell', 'cmd', 'appops', 'set', '--uid', '2000', 'WRITE_CONTACTS', 'allow'])
  adbQuiet(['shell', 'content', 'delete', '--uri', 'content://com.android.contacts/contacts'])
}

async function suiteContacts() {
  console.log('--- contacts ---')
  resetContacts()
  launch('one-native-contacts', ['READ_CONTACTS', 'WRITE_CONTACTS'])
  await tapTestIdOrText('one-native-contacts-run', 'Run Contacts proof')
  // the system picker covers the app, so drive it by its own markers.
  // a tap does not prove that the picker has closed. each subsequent
  // cancel targets a new native activity instance after selection.
  let selectedPickerActivity: string | undefined
  const canceledPickerActivities = new Set<string>()
  const nodes = await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined || findContaining(current, 'Status: failed') !== undefined,
    {
      timeoutMs: 180_000,
      dialogPolicy: 'allow',
      serviceKeywords: ['contact'],
      onDump: async (current) => {
        if (findContaining(current, 'Choose a contact') === undefined) return
        const activityState = adb(['shell', 'dumpsys', 'activity', 'activities'])
        const pickerActivity = activityState.match(
          /topResumedActivity=ActivityRecord\{(\S+) [^\n]*ContactPickerActivity\b/
        )?.[1]
        if (!pickerActivity) return
        writeFileSync(resolve(artifacts, `contacts-picker-${dumpCount}.activities.txt`), activityState)
        if (selectedPickerActivity === undefined) {
          const contact = findContaining(current, 'OneEdited')
          if (!contact?.bounds) return
          writeFileSync(resolve(artifacts, `contacts-picker-${dumpCount}.json`), JSON.stringify({ action: 'select', pickerActivity, contact }, null, 2))
          tapNode(contact)
          selectedPickerActivity = pickerActivity
        } else if (
          pickerActivity !== selectedPickerActivity &&
          !canceledPickerActivities.has(pickerActivity)
        ) {
          writeFileSync(resolve(artifacts, `contacts-picker-${dumpCount}.json`), JSON.stringify({ action: 'cancel', pickerActivity }, null, 2))
          adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
          canceledPickerActivities.add(pickerActivity)
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
  launch('one-native-calendar', ['READ_CALENDAR', 'WRITE_CALENDAR'])
  await tapTestIdOrText('one-native-calendar-run', 'Run Calendar proof')
  const nodes = await waitFor(
    (current) => findContaining(current, 'Status: done') !== undefined || findContaining(current, 'Status: failed') !== undefined,
    { timeoutMs: 180_000, dialogPolicy: 'allow', serviceKeywords: ['calendar'] }
  )
  dump('calendar-final.xml')
  const status = resultLine(nodes, 'Status: ')
  const result = resultLine(nodes, 'Result: ')
  check('calendar status', status, 'Status: done')
  check('calendar denial before grant', result, 'before=E_CALENDAR_PERMISSION')
  for (const field of ['matched=true', 'updated=true', 'removed=true', 'recurrenceListed=true', 'recurrenceRemoved=true', 'siblingsKeptAfterUpdate=true', 'siblingsKeptAfterDelete=true', 'middleRemoved=true', 'dateBounded=true', 'dateRemoved=true']) {
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
  launch('one-native-photo-library', ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_EXTERNAL_STORAGE'])
  await tapTestIdOrText('one-native-photo-library-run', 'Save image and video to Photos')
  let nodes = await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined || findContaining(current, 'Status: error') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow', serviceKeywords: ['photo', 'image', 'video', 'file', 'music'] }
  )
  check('photo save', resultLine(nodes, 'Status: '), 'Status: passed')
  check('photo save result', resultLine(nodes, 'Result: '), 'uri=E_PHOTO_LIBRARY_URI')

  await tapTestIdOrText('one-native-photo-library-read', 'Read saved Photos assets')
  nodes = await waitFor(
    (current) => findContaining(current, 'Status: read-passed') !== undefined || findContaining(current, 'Status: read-error') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow', serviceKeywords: ['photo', 'image', 'video', 'file', 'music'] }
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
    { timeoutMs: 120_000, dialogPolicy: 'allow', serviceKeywords: ['photo', 'image', 'video', 'file', 'music'] }
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
  launch('one-native-photo-library', ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_EXTERNAL_STORAGE'])
  await tapTestIdOrText('one-native-photo-library-run', 'Save image and video to Photos')
  await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined,
    { timeoutMs: 120_000, dialogPolicy: 'allow', serviceKeywords: ['photo', 'image', 'video', 'file', 'music'] }
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
        // system photo selection grid: keep one item selected, then confirm.
        const confirm = photoPickerConfirm(current)
        if (confirm !== undefined) {
          if (selectedPickerCount(current) === 0) {
            const first = unselectedPickerItems(current)[0]
            if (first === undefined) {
              swipeUp(current)
              return
            }
            tapNode(first)
            await sleep(1000)
          }
          const again = photoPickerConfirm(dump().nodes)
          if (again !== undefined) tapNode(again)
        }
      },
    }
  )
  nodes = dump('photo-limited-ready.xml').nodes
  check('photo limited ready', resultLine(nodes, 'Status: '), 'Status: limited-ready')

  // one tap per reshow. the cancel reshow backs straight out of
  // settings with no change; the delta reshow revokes in settings,
  // returns, then regrows through the permission dialog and grid.
  await tapTestIdOrText('one-native-photo-library-limited-pick', 'Choose more Photos assets')
  nodes = await waitFor(
    (current) => findContaining(current, 'Status: limited-passed') !== undefined || findContaining(current, 'Status: limited-error') !== undefined,
    {
      timeoutMs: 180_000,
      onDump: async (current) => {
        if (photoPickerConfirm(current) !== undefined) {
          adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
          await sleep(1000)
          return
        }
        // the radios page carries the dialog button set, so it backs
        // out before the dialog branch can mistake it for a prompt.
        if (photosRadioPage(current)) {
          adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
          await sleep(1000)
          return
        }
        if (dialogVisible(current)) {
          handlePermissionDialog(current, 'deny')
          return
        }
        if (appHomeVisible(current)) return
        if (settingsMarkersVisible(current)) {
          adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
          await sleep(1000)
        }
      },
    }
  )
  check('photo limited cancel passed', resultLine(nodes, 'Status: '), 'Status: limited-passed')
  const cancelled = resultLine(nodes, 'Limited result: ')
  for (const field of ['added=0', 'unchanged=true', 'preserved=true']) {
    check(`photo limited cancel ${field}`, cancelled, field)
  }
  await tapTestIdOrText('one-native-photo-library-limited-pick', 'Choose more Photos assets')
  // the status still reads passed from the cancel tap, so settle into
  // the delta flow before matching: settings is up within seconds and
  // the flow cannot finish before the driver completes it.
  await sleep(8000)
  // revoking in settings kills the process, so the delta either
  // survives to passed (same call) or resurrects at idle (second call
  // completes the armed reshow); a restarted run cannot prove
  // no-loss from js state, so preserved is asserted on survival only.
  let scrolls = 0
  let regrowing = false
  let sawIdle = false
  const completeGrid = async (current: XmlNode[]) => {
    // only unselected items grow the grant, so never tap a
    // selected one (taps toggle). scroll when nothing new shows.
    const confirm = photoPickerConfirm(current)
    if (confirm === undefined) return
    const fresh = unselectedPickerItems(current)
    if (fresh.length === 0) {
      scrolls += 1
      if (scrolls > 8) {
        tapNode(confirm)
        return
      }
      swipeUp(current)
      return
    }
    for (const pick of fresh.slice(0, 2)) {
      tapNode(pick)
      await sleep(500)
    }
    const again = photoPickerConfirm(dump().nodes)
    if (again !== undefined) tapNode(again)
  }
  nodes = await waitFor(
    (current) => {
      if (
        findContaining(current, 'Status: limited-passed') !== undefined ||
        findContaining(current, 'Status: limited-error') !== undefined
      ) {
        return true
      }
      if (findContaining(current, 'Status: idle') !== undefined) {
        sawIdle = true
        return true
      }
      return false
    },
    {
      timeoutMs: 300_000,
      onDump: async (current) => {
        if (photoPickerConfirm(current) !== undefined) {
          await completeGrid(current)
          return
        }
        // the radios page carries the dialog button set, so it is
        // claimed before the dialog branch runs.
        if (photosRadioPage(current)) {
          if (!regrowing) {
            for (let attempt = 0; attempt < 3 && !photoGrantRevoked(); attempt += 1) {
              const rows = dump().nodes
              const deny = rows.find((node) => norm(node.text) === "Don't allow")
              if (deny?.bounds !== undefined) tapNode(deny)
              await sleep(1500)
            }
            if (!photoGrantRevoked()) {
              throw new Error('photo limited delta: settings revoke did not land')
            }
            regrowing = true
          } else {
            adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
            await sleep(1000)
          }
          return
        }
        if (dialogVisible(current)) {
          // stray launch-time prompts deny; the regrow dialog takes
          // the limited option by its photos title.
          handlePermissionDialog(
            current,
            regrowing ? 'limited' : 'deny',
            regrowing ? ['photo', 'image', 'video'] : []
          )
          return
        }
        if (!regrowing) {
          if (appHomeVisible(current)) return
          if (tapSettingsRow(current, 'Photos and videos')) return
          if (tapSettingsRow(current, 'Permissions')) return
          if (settingsMarkersVisible(current)) settingsScroll()
          return
        }
        if (appHomeVisible(current)) return
        if (settingsMarkersVisible(current)) {
          adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
          await sleep(1000)
        }
      },
    }
  )
  if (sawIdle && resultLine(nodes, 'Status: ') !== 'Status: limited-passed') {
    await tapTestIdOrText('one-native-photo-library-limited-pick', 'Choose more Photos assets')
    nodes = await waitFor(
      (current) => findContaining(current, 'Status: limited-passed') !== undefined || findContaining(current, 'Status: limited-error') !== undefined,
      {
        timeoutMs: 180_000,
        onDump: async (current) => {
          if (photoPickerConfirm(current) !== undefined) {
            await completeGrid(current)
            return
          }
          if (dialogVisible(current)) {
            handlePermissionDialog(current, 'limited', ['photo', 'image', 'video'])
            return
          }
          if (appHomeVisible(current)) return
          if (settingsMarkersVisible(current)) {
            adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
            await sleep(1000)
          }
        },
      }
    )
  }
  dump('photo-limited-final.xml')
  check('photo limited passed', resultLine(nodes, 'Status: '), 'Status: limited-passed')
  const limited = resultLine(nodes, 'Limited result: ')
  const deltaFields = sawIdle
    ? ['readable=true', 'distinct=true', 'strict=true']
    : ['readable=true', 'preserved=true', 'distinct=true', 'strict=true']
  for (const field of deltaFields) {
    check(`photo limited ${field}`, limited, field)
  }
}

async function suiteAudio() {
  console.log('--- audio ---')
  launch('one-native-audio')
  await tapTestIdOrText('one-native-audio-run', 'Record and play')
  let nodes = await waitFor(
    (current) => findContaining(current, 'Status: passed') !== undefined || findContaining(current, 'Status: error') !== undefined,
    { timeoutMs: 180_000, dialogPolicy: 'allow', serviceKeywords: ['microphone', 'record', 'audio'] }
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
