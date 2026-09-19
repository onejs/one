import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { buildNativeRunCommand, nativeRun } from './nativeRun'

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
      expect(calls[0].argv).toEqual(
        expect.arrayContaining(['--port', String(port)])
      )
      expect(process.env.RCT_METRO_PORT).toBe(String(port))
    } finally {
      if (previousMetroPort === undefined) delete process.env.RCT_METRO_PORT
      else process.env.RCT_METRO_PORT = previousMetroPort
      server.close()
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
