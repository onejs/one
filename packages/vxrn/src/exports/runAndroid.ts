import { nativeRun } from '../utils/nativeRun'
import type { UserDepPatches } from '../utils/patches'

export const runAndroid = async ({
  root,
  port,
  patches,
}: {
  root: string
  port?: number
  patches?: UserDepPatches
}) => {
  console.info('› one run:android')
  return await nativeRun({ root, platform: 'android', port, patches })
}
