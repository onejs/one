import { nativeRun } from '../utils/nativeRun'
import type { UserDepPatches } from '../utils/patches'

export const runIos = async ({
  root,
  port,
  simulator,
  udid,
  patches,
}: {
  root: string
  port?: number
  simulator?: string
  udid?: string
  patches?: UserDepPatches
}) => {
  console.info('› one run:ios')
  return await nativeRun({ root, platform: 'ios', port, simulator, udid, patches })
}
