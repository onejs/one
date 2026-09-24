import { nativeRun } from '../utils/nativeRun'

export const runIos = async ({
  root,
  port,
  simulator,
  udid,
}: {
  root: string
  port?: number
  simulator?: string
  udid?: string
}) => {
  console.info('› one run:ios')
  return await nativeRun({ root, platform: 'ios', port, simulator, udid })
}
