import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { nativeDevBytecodeCompiler } from './compileNativeDevBytecode'

const savedHermescPath = process.env.HERMESC_PATH
beforeEach(() => {
  delete process.env.HERMESC_PATH
})
afterEach(() => {
  if (savedHermescPath === undefined) delete process.env.HERMESC_PATH
  else process.env.HERMESC_PATH = savedHermescPath
})

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

function hostHermesc(): string {
  const require = createRequire(import.meta.url)
  const compilerRoot = dirname(require.resolve('hermes-compiler/package.json'))
  const host = { darwin: 'osx-bin', linux: 'linux64-bin', win32: 'win64-bin' }[
    process.platform
  ]!
  return join(
    compilerRoot,
    'hermesc',
    host,
    process.platform === 'win32' ? 'hermesc.exe' : 'hermesc'
  )
}

it('uses HERMESC_PATH without any ios/Pods', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vxrn-dev-bytecode-override-'))
  process.env.HERMESC_PATH = hostHermesc()
  try {
    const compiler = nativeDevBytecodeCompiler(root)
    const bytes = await compiler(
      { code: 'globalThis.answer = 42;', map: '' },
      'http://localhost:8081/index.bundle?platform=ios'
    )
    expect(bytes.subarray(0, 8).toString('hex')).toBe('c61fbc03c103191f')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('treats empty HERMESC_PATH as unset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vxrn-dev-bytecode-empty-'))
  process.env.HERMESC_PATH = '   '
  try {
    expect(() => nativeDevBytecodeCompiler(root)).toThrow(
      /hermes-engine\.podspec\.json/
    )
    expect(() => nativeDevBytecodeCompiler(root)).not.toThrow(/HERMESC_PATH is set/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it.each(['missing binary', 'non-executable file'])(
  'loudly rejects a nonempty invalid HERMESC_PATH (%s)',
  async (kind) => {
    const root = await mkdtemp(join(tmpdir(), 'vxrn-dev-bytecode-invalid-'))
    try {
      if (kind === 'missing binary') {
        process.env.HERMESC_PATH = join(root, 'no-such-hermesc')
        expect(() => nativeDevBytecodeCompiler(root)).toThrow(
          /HERMESC_PATH is set but points nowhere/
        )
      } else {
        const plain = join(root, 'not-executable')
        await writeFile(plain, 'x')
        await chmod(plain, 0o644)
        process.env.HERMESC_PATH = plain
        expect(() => nativeDevBytecodeCompiler(root)).toThrow(
          /HERMESC_PATH is not executable/
        )
      }
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)

it('loudly rejects a root without ios/Pods when the override is unset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vxrn-dev-bytecode-nopods-'))
  try {
    expect(() => nativeDevBytecodeCompiler(root)).toThrow(
      /hermes-engine\.podspec\.json.*HERMESC_PATH/s
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

it('loudly rejects a malformed podspec when the override is unset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vxrn-dev-bytecode-malformed-'))
  try {
    const specs = join(root, 'ios/Pods/Local Podspecs')
    await mkdir(specs, { recursive: true })
    await writeFile(join(specs, 'hermes-engine.podspec.json'), '{oops')
    expect(() => nativeDevBytecodeCompiler(root)).toThrow(
      /hermes-engine\.podspec\.json/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
