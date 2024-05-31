import { Root } from './Root'
import { renderToString } from './server-render'
import type { GlobbedRouteImports } from './types'

export function createApp(options: { routes: GlobbedRouteImports }) {
  globalThis['__vxrnApp'] = options
  return {
    options,
    render: async ({ path }: { path: string }) => {
      return await renderToString(<Root routes={options.routes} path={path} />)
    },
  }
}
