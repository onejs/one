import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
    expect(
      buildNativeRunCommand({ platform: 'ios', simulator: 'iPhone 16' })
    ).toEqual({
      command: 'run-ios',
      argv: ['--no-packager', '--port', '8081', '--simulator', 'iPhone 16'],
      port: 8081,
    })
    expect(
      buildNativeRunCommand({ platform: 'ios', udid: 'some-udid' })
    ).toEqual({
      command: 'run-ios',
      argv: ['--no-packager', '--port', '8081', '--udid', 'some-udid'],
      port: 8081,
    })
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
    try {
      await nativeRun({
        root: workspaceRoot,
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

  it('resolves the ios bundle id from app.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nativerun-'))
    try {
      expect(resolveIosBundleId(dir)).toBeNull()
      writeFileSync(join(dir, 'app.json'), JSON.stringify({ expo: { ios: { bundleIdentifier: 'dev.example.app' } } }))
      expect(resolveIosBundleId(dir)).toBe('dev.example.app')
      writeFileSync(join(dir, 'app.json'), 'not json')
      expect(resolveIosBundleId(dir)).toBeNull()
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
})
