import type { SimpleDepPatchObject, PatchOptions } from 'vxrn'
import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: { force?: boolean }) {
  process.env.IS_VXRN_CLI = 'true'
  const { patch } = await import('vxrn')

  const options = await loadUserOneOptions('build')
  const deps = options.oneOptions.deps as SimpleDepPatchObject | undefined

  if (process.env.DEBUG) {
    console.info('User deps:', Object.keys(deps || {}))
  }

  await patch({
    root: process.cwd(),
    deps,
    force: args.force,
  } satisfies PatchOptions)
}
