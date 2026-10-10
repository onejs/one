import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { applyBuiltInPatches } from '../utils/patches'
import { buildNativeRunCommand, nativeRun, resolveIosBundleId } from './nativeRun'

vi.mock('../config/getOptionsFilled', () => ({
  fillOptions: vi.fn(async () => ({})),
}))
vi.mock('../utils/patches', () => ({
  applyBuiltInPatches: vi.fn(async () => {}),
}))

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(here, '..', '..', '..')

// an android sdk whose adb reports exactly these connected serials
function fakeAndroidSdk(serials: string[]) {
  const sdk = mkdtempSync(join(tmpdir(), 'nativerun-sdk-'))
  mkdirSync(join(sdk, 'platform-tools'))
  const listing = ['List of devices attached', ...serials.map((serial) => `${serial}\tdevice`)]
  writeFileSync(
    join(sdk, 'platform-tools', 'adb'),
    `#!/bin/sh\nprintf '%s\\n' ${listing.map((line) => `'${line}'`).join(' ')}\n`
  )
  chmodSync(join(sdk, 'platform-tools', 'adb'), 0o755)
  return sdk
}

async function withAndroidSdk<T>(serials: string[], serial: string | undefined, run: () => Promise<T>) {
  const sdk = fakeAndroidSdk(serials)
  const previous = { home: process.env.ANDROID_HOME, serial: process.env.ANDROID_SERIAL }
  process.env.ANDROID_HOME = sdk
  if (serial) process.env.ANDROID_SERIAL = serial
  else delete process.env.ANDROID_SERIAL
  try {
    return await run()
  } finally {
    if (previous.home === undefined) delete process.env.ANDROID_HOME
    else process.env.ANDROID_HOME = previous.home
    if (previous.serial === undefined) delete process.env.ANDROID_SERIAL
    else process.env.ANDROID_SERIAL = previous.serial
    rmSync(sdk, { recursive: true, force: true })
  }
}

async function withDevServer<T>(run: (port: number) => Promise<T>) {
  const server = createServer((req, res) => {
    res.end(req.url === '/status' ? 'packager-status:running' : 'ok')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  try {
    return await run(typeof address === 'object' && address ? address.port : 0)
  } finally {
    server.close()
  }
}

describe('expo-free run commands', () => {
  it('delegates build/install/launch to community cli with no packager', () => {
    expect(buildNativeRunCommand({ platform: 'ios', port: 8082 })).toEqual({
      command: 'run-ios',
      argv: ['--no-packager', '--port', '8082'],
      port: 8082,
    })
    expect(buildNativeRunCommand({ platform: 'android' })).toEqual({
      command: 'run-android',
      argv: ['--no-packager', '--port', '8081'],
      port: 8081,
    })
  })

  it('forwards an explicit simulator target instead of letting the cli pick', () => {
    expect(buildNativeRunCommand({ platform: 'ios', simulator: 'iPhone 16' })).toEqual({
      command: 'run-ios',
      argv: ['--no-packager', '--port', '8081', '--simulator', 'iPhone 16'],
      port: 8081,
    })
    expect(buildNativeRunCommand({ platform: 'ios', udid: 'some-udid' })).toEqual({
      command: 'run-ios',
      argv: ['--no-packager', '--port', '8081', '--udid', 'some-udid'],
      port: 8081,
    })
  })

  it('targets the selected Android device rather than launching on every emulator', () => {
    vi.stubEnv('ANDROID_SERIAL', 'emulator-5582')
    try {
      expect(buildNativeRunCommand({ platform: 'android', port: 8097 }).argv).toEqual([
        '--no-packager',
        '--port',
        '8097',
        '--device',
        'emulator-5582',
      ])
      expect(buildNativeRunCommand({ platform: 'ios' }).argv).not.toContain('--device')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('never resolves the expo cli', () => {
    const source = readFileSync(join(here, 'nativeRun.ts'), 'utf8')
    expect(source).not.toContain('expo/cli')
    expect(source).not.toContain('expoRun')
    expect(source).toContain('--no-packager')
    expect(source).toContain('@react-native-community/cli/package.json')
  })

  it('owns server, port, and launch args without starting devices', async () => {
    const server = createServer((req, res) => {
      res.end(req.url === '/status' ? 'packager-status:running' : 'ok')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    const calls: Array<{ executable: string; argv: string[] }> = []
    const previousMetroPort = process.env.RCT_METRO_PORT
    const root = mkdtempSync(join(tmpdir(), 'vxrn-run-no-app-cli-'))
    try {
      await nativeRun({
        root,
        platform: 'ios',
        port,
        spawn: (executable, argv) => {
          calls.push({ executable, argv })
        },
      })
      expect(calls).toHaveLength(1)
      expect(calls[0].executable).toBe(process.execPath)
      expect(calls[0].argv[1]).toBe('run-ios')
      expect(calls[0].argv).toContain('--no-packager')
      expect(calls[0].argv).toEqual(expect.arrayContaining(['--port', String(port)]))
      expect(process.env.RCT_METRO_PORT).toBe(String(port))
    } finally {
      if (previousMetroPort === undefined) delete process.env.RCT_METRO_PORT
      else process.env.RCT_METRO_PORT = previousMetroPort
      server.close()
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('waits for dependency patches before starting the native build', async () => {
    const server = createServer((req, res) => {
      res.end(req.url === '/status' ? 'packager-status:running' : 'ok')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    const calls: string[][] = []
    let finishPatches: (() => void) | undefined
    vi.mocked(applyBuiltInPatches).mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishPatches = resolve))
    )

    try {
      await withAndroidSdk(['emulator-5554'], undefined, async () => {
        const launch = nativeRun({
          root: workspaceRoot,
          platform: 'android',
          port,
          spawn: (_executable, argv) => calls.push(argv),
        })
        await new Promise<void>((resolve) => setImmediate(resolve))
        expect(calls).toHaveLength(0)

        finishPatches?.()
        await launch
        expect(calls).toHaveLength(1)
      })
    } finally {
      server.close()
    }
  })

  it('passes the simulator target through to the community cli', async () => {
    const server = createServer((req, res) => {
      res.end(req.url === '/status' ? 'packager-status:running' : 'ok')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    const calls: string[][] = []
    try {
      await nativeRun({
        root: workspaceRoot,
        platform: 'ios',
        port,
        udid: 'some-udid',
        spawn: (_executable, argv) => calls.push(argv),
      })
      expect(calls).toHaveLength(1)
      expect(calls[0]).toEqual(expect.arrayContaining(['--udid', 'some-udid']))
    } finally {
      server.close()
    }
  })

  it('resolves the ios bundle id from the prebuilt ios project', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nativerun-'))
    try {
      expect(resolveIosBundleId(dir)).toBeNull()
      mkdirSync(join(dir, 'ios', 'Example.xcodeproj'), { recursive: true })
      expect(resolveIosBundleId(dir)).toBeNull()
      writeFileSync(
        join(dir, 'ios', 'Example.xcodeproj', 'project.pbxproj'),
        'buildSettings = {\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = dev.example.app;\n\t\t\t};'
      )
      expect(resolveIosBundleId(dir)).toBe('dev.example.app')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails before launching when no dev server is running', async () => {
    await expect(
      nativeRun({
        root: workspaceRoot,
        platform: 'android',
        port: 1,
        spawn: () => {
          throw new Error('must not spawn without a dev server')
        },
      })
    ).rejects.toThrow(/No dev server running/)
  })

  it('fails before launching when no android device is connected', async () => {
    const spawn = vi.fn()
    await withDevServer((port) =>
      withAndroidSdk([], undefined, () =>
        expect(
          nativeRun({ root: workspaceRoot, platform: 'android', port, spawn })
        ).rejects.toThrow(/No Android device or emulator is connected/)
      )
    )
    expect(spawn).not.toHaveBeenCalled()
  })

  it('fails before launching when the chosen android serial is not connected', async () => {
    const spawn = vi.fn()
    await withDevServer((port) =>
      withAndroidSdk(['emulator-5554'], 'emulator-5556', () =>
        expect(
          nativeRun({ root: workspaceRoot, platform: 'android', port, spawn })
        ).rejects.toThrow(/emulator-5556 is not connected \(connected: emulator-5554\)/)
      )
    )
    expect(spawn).not.toHaveBeenCalled()
  })

  it('launches on the chosen android serial when it is connected', async () => {
    const calls: string[][] = []
    await withDevServer((port) =>
      withAndroidSdk(['emulator-5554', 'emulator-5556'], 'emulator-5556', () =>
        nativeRun({
          root: workspaceRoot,
          platform: 'android',
          port,
          spawn: (_executable, argv) => calls.push(argv),
        })
      )
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(expect.arrayContaining(['--device', 'emulator-5556']))
  })
})
