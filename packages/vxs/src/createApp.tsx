import { Root } from './Root'
import { renderToString } from './server-render'

export function createApp(options: { routes: Record<string, () => Promise<unknown>> }) {
  globalThis['__vxrnApp'] = options
  return {
    options,
    render: async ({ path }: { path: string }) => {
      return await renderToString(<Root routes={options.routes} path={path} />)
    },
  }
}
