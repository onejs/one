import './setup'

import { AppRegistry } from 'react-native'
import { Root } from './Root'
import { resolveClientLoader } from './clientLoaderResolver'
import { render } from './render'
import { renderToString } from './server-render'
import type { RenderAppProps } from './types'
// @ts-ignore
import ReactDOMServer from 'react-dom/server.browser'
import { getServerHeadInsertions } from './useServerHeadInsertion'
import { ensureExists } from './utils/ensureExists'
import {
  getServerContext,
  SERVER_CONTEXT_POST_RENDER_STRING,
  setServerContext,
} from './vite/server'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

export function createApp(options: CreateAppProps) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        let { loaderData, loaderProps, css, mode, loaderServerData } = props

        setServerContext({
          postRenderData: loaderServerData,
          loaderData,
          loaderProps,
          mode,
          css,
        })

        let renderId: string | undefined

        const App = () => {
          return (
            <Root
              onRenderId={(id) => {
                renderId = id
              }}
              routes={options.routes}
              {...props}
            />
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
          const extraHeadElements: React.ReactElement[] = []

          const styleTag = Application.getStyleElement({ nonce: process.env.ONE_NONCE })
          if (styleTag) {
            extraHeadElements.push(styleTag)
          }

          ensureExists(renderId)
          const insertions = getServerHeadInsertions(renderId)
          if (insertions) {
            for (const insertion of insertions) {
              const out = insertion()
              if (out) {
                extraHeadElements.push(out)
              }
            }
          }

          if (extraHeadElements.length) {
            const extraHeadHTML = ReactDOMServer.renderToStaticMarkup(<>{extraHeadElements}</>)

            if (extraHeadHTML) {
              html = html.replace(`</head>`, `${extraHeadHTML}</head>`)
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
        const postRenderData = getServerContext()?.postRenderData

        if (postRenderData) {
          html = html.replace(
            JSON.stringify(SERVER_CONTEXT_POST_RENDER_STRING),
            JSON.stringify(postRenderData)
          )
        }

        return html
      },
    }
  }

  // run their root layout before calling resolveClientLoader so they can register hook
  const rootLayoutImport = options.routes['/app/_layout.tsx']?.()

  return rootLayoutImport
    .then(() => {
      resolveClientLoader(getServerContext() || {})
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
