import type { SimpleDepPatchObject, PatchOptions } from 'vxrn'
import { loadUserOneOptions } from '../vite/loadConfig'
import { maybeGenerateBundlerConfigOnInstall } from './generateBundlerConfig'

function isMissingViteConfigError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith('No config config in ') &&
    error.message.endsWith(' Is this the correct directory?')
  )
}

async function loadUserOptions() {
  try {
    return await loadUserOneOptions('build')
  } catch (error) {
    if (isMissingViteConfigError(error)) {
      return undefined
    }
    throw error
  }
}

export async function run(args: { force?: boolean }) {
  process.env.IS_VXRN_CLI = 'true'
  const { patch } = await import('vxrn')

  const options = await loadUserOptions()

  // ensure babel.config.cjs + metro.config.cjs exist when a project uses
  // expo-updates and we're on an eas/ci worker. the generated files capture
  // the loaded one() router/setup options so standalone metro matches one.
  if (options) {
    maybeGenerateBundlerConfigOnInstall(process.cwd(), options.oneOptions)
  }

  const patches = options?.oneOptions.patches as SimpleDepPatchObject | undefined

  if (process.env.DEBUG) {
    console.info('User patches:', Object.keys(patches || {}))
  }

  await patch({
    root: process.cwd(),
    deps: patches,
    force: args.force,
  } satisfies PatchOptions)
}
