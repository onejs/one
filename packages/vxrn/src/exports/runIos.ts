import { expoRun } from '../utils/expoRun'

export const runIos = async ({ root }: { root: string }) => {
  console.info('› one run:ios')
  return await expoRun({ root, platform: 'ios' })
}
