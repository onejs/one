import { isWebServer } from './constants'
import type { One } from './vite/types'

const CLIENT_RENDER_MODE = process.env.One_DEFAULT_RENDER_MODE as One.RouteRenderMode | undefined

// works client or server
export const getDefaultRenderMode = () => {
  const serverConfig = globalThis['__vxrnPluginConfig__'] as One.PluginOptions | undefined

  if (isWebServer && !serverConfig) {
    throw new Error(`Internal one error: should call setServerConfig before createManifest`)
  }

  return CLIENT_RENDER_MODE ?? serverConfig?.web?.defaultRenderMode ?? 'ssg'
}
