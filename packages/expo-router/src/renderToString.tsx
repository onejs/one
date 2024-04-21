import ReactDOMServer from 'react-dom/server'
import { preloadRoutes } from './useViteRoutes'
import type { GlobbedRouteImports } from './types'

export const renderToString = async (
  app: React.ReactElement,
  { routes }: { routes?: GlobbedRouteImports } = {}
) => {
  console.log('routes', routes)
  if (routes) {
    await preloadRoutes(routes)
  }

  const collectedHead: { helmet?: Record<string, any> } = {}
  globalThis['vxrn__headContext__'] = collectedHead

  const appHtml = ReactDOMServer.renderToString(app)

  const headHtml = `${Object.values(collectedHead?.helmet ?? {})
    .map((v: any) => v.toString())
    .join('\n')}`

  return { appHtml, headHtml }
}
