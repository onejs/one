import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)
const [serial, apk, evidence] = process.argv.slice(2)
if (!serial || !apk || !evidence)
  throw new Error('usage: node run-proof.mjs <claimed-serial> <apk> <evidence-directory>')
const adb = process.env.ADB ?? 'adb'
const app = 'dev.onejs.backgroundproof'
const command = (...args) =>
  run(adb, ['-s', serial, ...args], { maxBuffer: 16 * 1024 * 1024 })
const saveCommand = async (name, ...args) => {
  const { stdout } = await command(...args)
  await writeFile(path.join(evidence, name), stdout)
  return stdout
}
await mkdir(evidence, { recursive: true })
await command('install', '-r', apk)
// clear only this uniquely named proof app; never touch another installed proof.
await command('shell', 'pm', 'clear', app)
await command('shell', 'pm', 'grant', app, 'android.permission.POST_NOTIFICATIONS')
await command('shell', 'dumpsys', 'battery', 'unplug')
await command('shell', 'dumpsys', 'battery', 'set', 'status', '3')
const battery = await saveCommand('battery-before.txt', 'shell', 'dumpsys', 'battery')
if (
  !['AC powered: false', 'USB powered: false', 'Wireless powered: false'].every((value) =>
    battery.includes(value)
  )
) {
  throw new Error(`device is still charging: ${battery}`)
}
const log = spawn(adb, [
  '-s',
  serial,
  'logcat',
  '-T',
  '1',
  '-v',
  'brief',
  'BackgroundProof:I',
  'OneBackgroundTasks:E',
  'AndroidRuntime:E',
  '*:S',
])
let logText = ''
const records = []
const waiting = new Set()
const lines = createInterface({ input: log.stdout })
lines.on('line', (line) => {
  logText += `${line}\n`
  const start = line.indexOf('{')
  if (start < 0 || !line.includes('BackgroundProof')) return
  try {
    records.push(JSON.parse(line.slice(start)))
    for (const check of waiting) check()
  } catch {
    /* unrelated platform log line */
  }
})
function until(predicate, description) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      waiting.delete(check)
      reject(new Error(`timed out: ${description}`))
    }, 180_000)
    function check() {
      if (!predicate()) return
      clearTimeout(timeout)
      waiting.delete(check)
      resolve()
    }
    waiting.add(check)
    check()
  })
}
try {
  await command(
    'shell',
    'am',
    'start',
    '-W',
    '-n',
    `${app}/dev.vxrn.nativefeatures.tests.BackgroundProofActivity`
  )
  await until(
    () =>
      records.some(
        (row) =>
          row.event === 'javascript' && JSON.parse(row.detail).event === 'scheduled'
      ),
    'real requests submitted'
  )
  await saveCommand('jobs-before-kill.txt', 'shell', 'dumpsys', 'jobscheduler')
  const warmPid = (await command('shell', 'pidof', app)).stdout.trim()
  await writeFile(path.join(evidence, 'pid-before-kill.txt'), warmPid)
  await command('shell', 'input', 'keyevent', 'KEYCODE_HOME')
  await command('shell', 'am', 'kill', app)
  // pidof exits 1 when the process is absent. preserve output for verification.
  let afterKill
  try {
    afterKill = (await command('shell', 'pidof', app)).stdout
  } catch (error) {
    if (error.code !== 1) throw error
    afterKill = error.stdout
  }
  await writeFile(path.join(evidence, 'pid-after-kill.txt'), afterKill)
  if (afterKill.trim()) throw new Error(`am kill left process ${afterKill}`)
  await saveCommand(
    'activities-after-kill.txt',
    'shell',
    'dumpsys',
    'activity',
    'activities'
  )
  await writeFile(path.join(evidence, 'power-enabled-at.txt'), String(Date.now()))
  await command('shell', 'dumpsys', 'battery', 'set', 'ac', '1')
  await command('shell', 'dumpsys', 'battery', 'set', 'status', '2')
  const expected = [
    'proof.refresh:SUCCEEDED',
    'proof.power:SUCCEEDED',
    'proof.cancel:CANCELLED',
    'proof.fail:FAILED',
  ]
  await until(
    () =>
      expected.every((detail) =>
        records.some((row) => row.event === 'terminal' && row.detail === detail)
      ),
    'OS-dispatched cold handlers and WorkManager terminal states'
  )
  await saveCommand(
    'background-proof.jsonl',
    'shell',
    'run-as',
    app,
    'cat',
    'files/background-proof.jsonl'
  )
  for (const name of [
    'androidx.work.workdb',
    'androidx.work.workdb-wal',
    'androidx.work.workdb-shm',
  ]) {
    const { stdout } = await run(
      adb,
      ['-s', serial, 'exec-out', 'run-as', app, 'cat', `no_backup/${name}`],
      { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 }
    )
    await writeFile(path.join(evidence, name), stdout)
  }
  await saveCommand('jobs-after-delivery.txt', 'shell', 'dumpsys', 'jobscheduler')
  const { stdout } = await run('python3', [
    new URL('./verify.py', import.meta.url).pathname,
    evidence,
  ])
  await writeFile(path.join(evidence, 'verification.txt'), stdout)
  console.log(stdout)
} finally {
  log.kill('SIGTERM')
  lines.close()
  await writeFile(path.join(evidence, 'runtime-logcat.txt'), logText)
  await command('shell', 'dumpsys', 'battery', 'reset')
}
