import { Hono } from 'hono'
import { createProdServer } from 'vxrn/serve'
import { oneServe } from './server/oneServe'
import { setServerGlobals } from './server/setServerGlobals'
import { setupBuildInfo } from './server/setupBuildOptions'
import { ensureExists } from './utils/ensureExists'
import type { One } from './vite/types'

export async function serve(buildInfo: One.BuildInfo) {
  setupBuildInfo(buildInfo)
  ensureExists(buildInfo.oneOptions)
  setServerGlobals()

  const serverOptions = buildInfo.oneOptions.server || {}

  const app = new Hono()

  await createProdServer(app, serverOptions)

  await oneServe(buildInfo.oneOptions, buildInfo, app, false)

  return app
}
