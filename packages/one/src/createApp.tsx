import './setup'

import { AppRegistry } from 'react-native'
import { Root } from './Root'
import { resolveClientLoader } from './clientLoaderResolver'
import { render } from './render'
import { renderToString } from './server-render'
import type { RenderAppProps } from './types'
import { rand } from './utils/rand'
// @ts-ignore
import ReactDOMServer from 'react-dom/server.browser'
import {
  getServerContext,
  SERVER_CONTEXT_POST_RENDER_STRING,
  ServerContextScript,
  setServerContext,
} from './utils/serverContext'
import { useId, useMemo } from 'react'
import { DevHead } from './vite/DevHead'
import { HoistHTMLContext } from './router/hoistHTML'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

export function createApp(options: CreateAppProps) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        let { loaderData, loaderProps, css, mode } = props

        setServerContext({
          css,
        })

        const App = () => {
          const id = useId()

          return (
            <HoistHTMLContext.Provider
              value={useMemo(() => {
                return (value) => {
                  console.warn('should hoist', value)
                }
              }, [])}
            >
              <html lang="en-US">
                <head>
                  <DevHead ssrID={id} />
                  <script
                    dangerouslySetInnerHTML={{
                      __html: `globalThis['global'] = globalThis`,
                    }}
                  />
                  {css?.map((file) => {
                    return <link key={file} rel="stylesheet" href={file} />
                  })}
                  <ServerContextScript />
                </head>
                <Root routes={options.routes} {...props} />
              </html>
            </HoistHTMLContext.Provider>
          )
        }

        AppRegistry.registerComponent('App', () => App)

        // @ts-expect-error
        const Application = AppRegistry.getApplication('App', {})

        // we've got to remove the outer containers because it messes up the fact we render root html
        const rootElement = Application.element.props.children

        let html = await renderToString(rootElement, {
          preloads: props.preloads,
        })

        try {
          const styleTag = Application.getStyleElement({ nonce: process.env.ONE_NONCE })
          if (styleTag) {
            const rnwStyleHTML = ReactDOMServer.renderToStaticMarkup(styleTag)
            if (rnwStyleHTML) {
              html = html.replace(`</head>`, `${rnwStyleHTML}</head>`)
            }
          }
        } catch (err) {
          // react-native-web-lite has a bug but its fine we don't need it for now
          // but TODO is fix this in react-native-web-lite
          if (`${err}`.includes(`sheet is not defined`)) {
            // ok
          } else {
            throw err
          }
        }

        // now we can grab and serialize in our zero queries
        const serverData = getServerContext()?.postRenderData
        if (serverData) {
          const hasQueryData = Object.keys(serverData).length
          if (hasQueryData) {
            html = html.replace(
              JSON.stringify(SERVER_CONTEXT_POST_RENDER_STRING),
              JSON.stringify(serverData)
            )
          }
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
          render(<Root mode="spa" isClient routes={options.routes} path={window.location.href} />)
        })
        .catch((err) => {
          console.error(`Error running client loader resolver "onClientLoaderResolve":`, err)
        })
    })
    .catch((err) => {
      console.error(`Error importing root layout on client`, err)
    })
}
