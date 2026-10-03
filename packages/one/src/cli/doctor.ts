import { checkNativePackages } from './checkNativePackages'
import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: { platform?: string }) {
  let platform = args.platform
  if (!platform) {
    const { oneOptions } = await loadUserOneOptions('build', true)
    const native = oneOptions?.native
    platform = typeof native === 'object' && native.app ? undefined : 'web'
  }
  checkNativePackages(process.cwd(), platform)
  console.info(
    `[one] ${platform === 'web' ? 'web app: native peers are optional' : 'native packages match the tested set'}`
  )
}
