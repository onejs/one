import { accessSync, constants, readFileSync, statSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { NativeDevBundle } from './createNativeDevEngine'

const execute = promisify(execFile)

// explicit compiler ownership for split layouts, where the dev server root
// is not the native project (the iOS test job serves tests/test while the
// container is built from tests/rn-test-container). empty means unset.
function useHermescOverride(): string | undefined {
  const override = process.env.HERMESC_PATH?.trim()
  if (!override) return undefined
  let stat: ReturnType<typeof statSync> | undefined
  try {
    stat = statSync(override)
  } catch {
    stat = undefined
  }
  if (!stat?.isFile()) {
    throw new Error(
      `[vxrn] HERMESC_PATH is set but points nowhere: ${override}. ` +
        `Point it at the hermesc binary the native build used, or unset it to resolve the pod compiler.`
    )
  }
  try {
    accessSync(override, constants.X_OK)
  } catch {
    throw new Error(
      `[vxrn] HERMESC_PATH is not executable: ${override}. ` +
        `Point it at the hermesc binary the native build used, or unset it to resolve the pod compiler.`
    )
  }
  return override
}

// the pod compiler matches the actual native vm, including rn's prebuilt
// hermes replacement. the npm compiler can target a different bytecode version.
function resolvePodHermesc(root: string): string {
  const pods = join(root, 'ios/Pods')
  const podspecPath = join(pods, 'Local Podspecs/hermes-engine.podspec.json')
  let podspec: {
    subspecs: { name: string }[]
    user_target_xcconfig?: { HERMES_CLI_PATH?: string }
  }
  try {
    podspec = JSON.parse(readFileSync(podspecPath, 'utf8'))
  } catch (error) {
    throw new Error(
      `[vxrn] native iOS dev bytecode needs the pod hermesc but ${root} has no usable native project: ` +
        `cannot read ${podspecPath} (${error instanceof Error ? error.message : String(error)}). ` +
        `Run prebuild and pod install for this app, or set HERMESC_PATH to the hermesc the native build used.`
    )
  }
  if (!Array.isArray(podspec.subspecs)) {
    throw new Error(
      `[vxrn] native iOS dev bytecode needs the pod hermesc but ${podspecPath} declares no subspecs. ` +
        `Reinstall pods for this app, or set HERMESC_PATH to the hermesc the native build used.`
    )
  }
  const prebuilt = podspec.subspecs.some(
    (spec: { name: string }) => spec.name === 'Pre-built'
  )
  if (prebuilt) {
    return join(pods, 'hermes-engine/destroot/bin/hermesc')
  }
  const cliPath = podspec.user_target_xcconfig?.HERMES_CLI_PATH
  if (!cliPath) {
    throw new Error(
      `[vxrn] native iOS dev bytecode needs the pod hermesc but ${podspecPath} declares no HERMES_CLI_PATH. ` +
        `Reinstall pods for this app, or set HERMESC_PATH to the hermesc the native build used.`
    )
  }
  return cliPath.replace(/\$\(PODS_ROOT\)|\$\{PODS_ROOT\}/g, pods)
}

// compile once per emitted bundle. the device can start a fresh hermes context
// without compiling every cold route's module closures on its js thread.
export function nativeDevBytecodeCompiler(root: string) {
  const compiler = useHermescOverride() ?? resolvePodHermesc(root)
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
