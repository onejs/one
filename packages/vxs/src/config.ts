import { isWebServer } from './constants'
import type { VXS } from './vite/types'

const CLIENT_RENDER_MODE = process.env.VXS_DEFAULT_RENDER_MODE as VXS.RouteRenderMode | undefined

// works client or server
export const getDefaultRenderMode = () => {
  const serverConfig = globalThis['__vxrnPluginConfig__'] as VXS.PluginOptions | undefined

  if (isWebServer && !serverConfig) {
    throw new Error(`Internal vxs error: should call setServerConfig before createManifest`)
  }

  return CLIENT_RENDER_MODE ?? serverConfig?.web?.defaultRenderMode ?? 'ssg'
}
