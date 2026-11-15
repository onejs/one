import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

// bind the already-staged dev container before the existing test setup copies it.
if (process.env.ONE_NATIVE_HMR_TRACE) {
  const app = process.env.IOS_TEST_CONTAINER_PATH_DEV
  const udid = process.env.SIMULATOR_UDID
  if (!app || !udid)
    throw new Error('native HMR receipt requires staged app and simulator')
  const plistPath = join(app, 'Info.plist')
  const plist = JSON.parse(
    execFileSync('plutil', ['-convert', 'json', '-o', '-', plistPath], {
      encoding: 'utf8',
    })
  )
  if (typeof plist.CFBundleExecutable !== 'string') {
    throw new Error('staged native app has no CFBundleExecutable')
  }
  const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
  const devices = JSON.parse(
    execFileSync('xcrun', ['simctl', 'list', 'devices', '--json'], { encoding: 'utf8' })
  ).devices
  const runtime = Object.entries(devices).find(([, entries]) =>
    entries.some((device) => device.udid === udid)
  )
  if (!runtime) throw new Error(`staged native app simulator not found: ${udid}`)
  const require = createRequire(new URL('../package.json', import.meta.url))
  const versions = Object.fromEntries(
    ['one', 'rolldown', 'react-native'].map((name) => {
      const manifest = require.resolve(`${name}/package.json`)
      return [
        name,
        {
          version: JSON.parse(readFileSync(manifest, 'utf8')).version,
          manifestSha256: hash(manifest),
        },
      ]
    })
  )
  appendFileSync(
    process.env.ONE_NATIVE_HMR_TRACE,
    JSON.stringify({
      at: new Date().toISOString(),
      pid: process.pid,
      monotonicMs: performance.now(),
      event: 'native-container',
      source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      app,
      executable: plist.CFBundleExecutable,
      executableSha256: hash(join(app, plist.CFBundleExecutable)),
      infoPlistSha256: hash(plistPath),
      bundleId: plist.CFBundleIdentifier,
      version: plist.CFBundleShortVersionString,
      build: plist.CFBundleVersion,
      sdk: plist.DTSDKName,
      platformVersion: plist.DTPlatformVersion,
      simulator: {
        runtime: runtime[0],
        ...runtime[1].find((device) => device.udid === udid),
      },
      node: process.version,
      versions,
    }) + '\n'
  )
}
