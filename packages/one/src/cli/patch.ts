import type { SimpleDepPatchObject, PatchOptions } from 'vxrn'
import { loadUserOneOptions } from '../vite/loadConfig'
import { maybeGenerateBundlerConfigOnInstall } from './generateBundlerConfig'

export async function run(args: { force?: boolean }) {
  // ensure babel.config.cjs + metro.config.cjs exist when a project uses
  // expo-updates AND we're on an EAS/CI worker. CI-only so the files
  // never appear in a developer's local working tree.
  maybeGenerateBundlerConfigOnInstall(process.cwd())

  process.env.IS_VXRN_CLI = 'true'
  const { patch } = await import('vxrn')

  const options = await loadUserOneOptions('build')
  const patches = options.oneOptions.patches as SimpleDepPatchObject | undefined

  if (process.env.DEBUG) {
    console.info('User patches:', Object.keys(patches || {}))
  }

  await patch({
    root: process.cwd(),
    deps: patches,
    force: args.force,
  } satisfies PatchOptions)
}
