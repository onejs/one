import FSExtra from 'fs-extra'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { VXRNOptions } from '../types'
import { fillOptions } from '../utils/getOptionsFilled'
import { getSSRExternalsCachePath } from '../plugins/autoDepOptimizePlugin'

/**
 * The main entry point for dev mode
 *
 * Note that much of the logic is being run by plugins:
 *
 *  - createFileSystemRouterPlugin does most of the fs-routes/request handling
 *  - clientTreeShakePlugin handles loaders/transforms
 *
 */

export const clean = async (rest: VXRNOptions) => {
  const options = await fillOptions(rest)
  const { root } = options

  console.info(`[vxrn] cleaning`)

  await Promise.all([
    rm(getSSRExternalsCachePath(root)).catch(throwIfNotMissingError),
    rm(join(root, 'node_modules', '.vite'), {
      recursive: true,
      force: true,
    }).catch(throwIfNotMissingError),
    // temp to speed up clean builds
    // rm(join(root, 'node_modules', '.vxrn'), {
    //   recursive: true,
    //   force: true,
    // }).catch(throwIfNotMissingError),
    rm(join(root, 'dist'), {
      recursive: true,
      force: true,
    }).catch(throwIfNotMissingError),
  ])
}

function throwIfNotMissingError(err: unknown) {
  if (err instanceof Error) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw Error
    }
  }
}
