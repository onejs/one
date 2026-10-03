import { nativeRun } from '../utils/nativeRun'

export const runAndroid = async ({ root, port }: { root: string; port?: number }) => {
  console.info('› one run:android')
  return await nativeRun({ root, platform: 'android', port })
}
