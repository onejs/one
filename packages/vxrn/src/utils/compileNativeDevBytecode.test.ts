import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, it } from 'vitest'
import { nativeDevBytecodeCompiler } from './compileNativeDevBytecode'

it.each(['prebuilt', 'source'])(
  'shares compiled bytes and retries failures with %s hermes',
  async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'vxrn-dev-bytecode-test-'))
    const require = createRequire(import.meta.url)
    const compilerRoot = dirname(require.resolve('hermes-compiler/package.json'))
    const host = { darwin: 'osx-bin', linux: 'linux64-bin', win32: 'win64-bin' }[
      process.platform
    ]!
    const pod = join(root, 'ios/Pods/hermes-engine/destroot/bin')
    try {
      await mkdir(pod, { recursive: true })
      await symlink(
        join(
          compilerRoot,
          'hermesc',
          host,
          process.platform === 'win32' ? 'hermesc.exe' : 'hermesc'
        ),
        join(pod, 'hermesc')
      )
      const specs = join(root, 'ios/Pods/Local Podspecs')
      await mkdir(specs, { recursive: true })
      await writeFile(
        join(specs, 'hermes-engine.podspec.json'),
        JSON.stringify({
          subspecs: [{ name: mode === 'prebuilt' ? 'Pre-built' : 'Hermes' }],
          user_target_xcconfig: {
            HERMES_CLI_PATH: '${PODS_ROOT}/hermes-engine/destroot/bin/hermesc',
          },
        })
      )
      const compiler = nativeDevBytecodeCompiler(root)
      const compile = (bundle: { code: string; map: string }) =>
        compiler(bundle, 'http://localhost:8081/index.bundle?platform=ios')
      const first = { code: 'globalThis.answer = 42;', map: '' }
      const pending = compile(first)
      expect(compile(first)).toBe(pending)
      const bytes = await pending
      expect(bytes.subarray(0, 8).toString('hex')).toBe('c61fbc03c103191f')
      expect(await compile(first)).toBe(bytes)
      const changed = await compile({ code: 'globalThis.answer = 43;', map: '' })
      expect(changed.equals(bytes)).toBe(false)
      const invalid = { code: 'function {', map: '' }
      const failed = compile(invalid)
      await expect(failed).rejects.toThrow()
      const retried = compile(invalid)
      expect(retried).not.toBe(failed)
      await expect(retried).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)
