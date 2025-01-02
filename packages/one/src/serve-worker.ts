import { createProdServer } from 'vxrn/serve'
import { oneServe } from './server/oneServe'
import type { One } from './vite/types'
import { setupBuildInfo } from './server/setupBuildOptions'
import { ensureExists } from './utils/ensureExists'

export async function serve(buildInfo: One.BuildInfo) {
  setupBuildInfo(buildInfo)
  ensureExists(buildInfo.oneOptions)

  // TODO make this better, this ensures we get react 19
  process.env.VXRN_REACT_19 = '1'

  const serverOptions = buildInfo.oneOptions.server || {}

  const app = await createProdServer(serverOptions)

  await oneServe(buildInfo.oneOptions, buildInfo, app, false)

  return app
}
