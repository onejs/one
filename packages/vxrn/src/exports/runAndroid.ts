import { expoRun } from '../utils/expoRun'

export const runAndroid = async ({ root }: { root: string }) => {
  console.info('› one run:android')
  return await expoRun({ root, platform: 'android' })
}
