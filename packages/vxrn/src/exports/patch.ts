import type { VXRNOptions } from '../types'
import { fillOptions } from '../utils/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'

export type DevOptions = VXRNOptions & { clean?: boolean }

export const patch = async (optionsIn: DevOptions) => {
  const options = await fillOptions(optionsIn)

  await applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })
}
