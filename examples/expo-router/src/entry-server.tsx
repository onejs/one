import ReactDOMServer from 'react-dom/server'

import { App, routes } from './App'
import { preloadRoutes } from './hooks/useRoutes'

export const render = async ({ path }: { path: string }) => {
  await preloadRoutes(routes)

  const collectedHead: { helmet?: Record<string, any> } = {}
  globalThis['vxrn__headContext__'] = collectedHead

  const appHtml = ReactDOMServer.renderToString(<App path={path} />)

  const headHtml = `${Object.values(collectedHead?.helmet ?? {})
    .map((v: any) => v.toString())
    .join('\n')}`

  return { appHtml, headHtml }
}

export async function getRoutes() {
  return await preloadRoutes(routes)
}
