import { nativeRun } from '../utils/nativeRun'

export const runIos = async ({ root, port }: { root: string; port?: number }) => {
  console.info('› one run:ios')
  return await nativeRun({ root, platform: 'ios', port })
}
