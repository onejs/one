import { Root } from './Root'
import { render } from './render'
import { renderToString } from './server-render'
import type { RenderAppProps } from './types'

export function createApp(options: { routes: Record<string, () => Promise<unknown>> }) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        return await renderToString(<Root routes={options.routes} {...props} />, {
          preloads: props.preloads,
        })
      },
    }
  }

  // on client we just render
  render(<Root isClient routes={options.routes} path={window.location.pathname} />)
}
