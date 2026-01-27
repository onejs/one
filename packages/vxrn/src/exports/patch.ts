import type { VXRNOptions } from '../types'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches, type SimpleDepPatchObject } from '../utils/patches'

export type PatchOptions = VXRNOptions & {
  deps?: SimpleDepPatchObject
  force?: boolean
}

export const patch = async (optionsIn: PatchOptions) => {
  process.env.IS_VXRN_CLI = 'true'
  if (optionsIn.force) {
    process.env.VXRN_FORCE_PATCH = '1'
  }
  const options = await fillOptions(optionsIn)
  await applyBuiltInPatches(options, optionsIn.deps)
}
