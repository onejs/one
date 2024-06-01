import { Root } from './Root'
import { render } from './render'
import { renderToString } from './server-render'

export function createApp(options: { routes: Record<string, () => Promise<unknown>> }) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async ({
        path,
        preloads,
        loaderData,
        loaderProps,
      }: { path: string; preloads?: string[]; loaderData?: any; loaderProps?: Object }) => {
        return await renderToString(
          <Root
            routes={options.routes}
            path={path}
            loaderData={loaderData}
            loaderProps={loaderProps}
          />,
          { preloads }
        )
      },
    }
  }

  // on client we just render
  render(<Root isClient routes={options.routes} path={window.location.pathname} />)
}
