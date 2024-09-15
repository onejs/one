import { Root } from './Root'
import { resolveClientLoader } from './clientLoaderResolver'
import { render } from './render'
import { renderToString } from './server-render'
import type { RenderAppProps } from './types'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

export function createApp(options: CreateAppProps) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        let html = await renderToString(<Root routes={options.routes} {...props} />, {
          preloads: props.preloads,
        })

        // now we can grab and serialize in our zero queries
        const serverData = globalThis['__vxrnServerData__']
        const hasQueryData = Object.keys(serverData).length
        if (hasQueryData) {
          html = html.replace(`{ __vxrn__: 'post-render' }`, JSON.stringify(serverData))
        }

        return html
      },
    }
  }

  // run their root layout before calling resolveClientLoader so they can register hook
  const rootLayoutImport = options.routes['/app/_layout.tsx']?.()

  return rootLayoutImport
    .then(() => {
      resolveClientLoader({
        loaderData: globalThis['__vxrnLoaderData__'],
        loaderServerData: globalThis['__vxrnLoaderServerData__'],
        loaderProps: globalThis['__vxrnLoaderProps__'],
      })
        .then(() => {
          // on client we just render
          render(<Root isClient routes={options.routes} path={window.location.href} />)
        })
        .catch((err) => {
          console.error(`Error running client loader resolver "onClientLoaderResolve":`, err)
        })
    })
    .catch((err) => {
      console.error(`Error importing root layout on client`, err)
    })
}
