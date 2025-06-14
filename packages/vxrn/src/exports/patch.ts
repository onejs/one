import type { VXRNOptions } from '../types'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches, type SimpleDepPatchObject } from '../utils/patches'

export type DevOptions = VXRNOptions & { clean?: boolean; deps?: SimpleDepPatchObject }

export const patch = async (optionsIn: DevOptions) => {
  const options = await fillOptions(optionsIn)
  await applyBuiltInPatches(options, optionsIn.deps)
  console.info(`✓ Applied patches`)
}
