import { readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { NativeDevBundle } from './createNativeDevEngine'

const execute = promisify(execFile)

// compile once per emitted bundle. the device can start a fresh hermes context
// without compiling every cold route's module closures on its js thread.
export function nativeDevBytecodeCompiler(root: string) {
  // the pod compiler matches the actual native vm, including rn's prebuilt
  // hermes replacement. the npm compiler can target a different bytecode version.
  const pods = join(root, 'ios/Pods')
  const podspec = JSON.parse(
    readFileSync(join(pods, 'Local Podspecs/hermes-engine.podspec.json'), 'utf8')
  )
  const prebuilt = podspec.subspecs.some(
    (spec: { name: string }) => spec.name === 'Pre-built'
  )
  const compiler = prebuilt
    ? join(pods, 'hermes-engine/destroot/bin/hermesc')
    : podspec.user_target_xcconfig.HERMES_CLI_PATH.replace(
        /\$\(PODS_ROOT\)|\$\{PODS_ROOT\}/g,
        pods
      )
  const compiled = new WeakMap<NativeDevBundle, Map<string, Promise<Buffer>>>()

  return (bundle: NativeDevBundle, sourceURL: string): Promise<Buffer> => {
    let urls = compiled.get(bundle)
    if (!urls) compiled.set(bundle, (urls = new Map()))
    const existing = urls.get(sourceURL)
    if (existing) return existing
    const result = (async () => {
      const directory = await mkdtemp(join(tmpdir(), 'vxrn-dev-hermes-'))
      try {
        // hermesc records its input argument as the debug filename. use the
        // served js url as a relative filename so stacks and devtools retain
        // the original bundle coordinates without a second source map.
        const source = join(directory, sourceURL)
        await mkdir(dirname(source), { recursive: true })
        const output = join(directory, 'index.hbc')
        await writeFile(source, bundle.code)
        await execute(
          compiler,
          ['-Og', '-g', '-emit-binary', '-out', output, sourceURL],
          { cwd: directory, maxBuffer: 16 * 1024 * 1024 }
        )
        return await readFile(output)
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    })().catch((error) => {
      urls.delete(sourceURL)
      throw error
    })
    urls.set(sourceURL, result)
    return result
  }
}
