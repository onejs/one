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

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

// replacing Vites since we control the root
function DevHead({ ssrID }: { ssrID: string }) {
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        <link rel="preload" href={ssrID} as="style" />
        <link rel="stylesheet" href={ssrID} data-ssr-css />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `import { createHotContext } from "/@vite/client";
  const hot = createHotContext("/__clear_ssr_css");
  hot.on("vite:afterUpdate", () => {
    document
      .querySelectorAll("[data-ssr-css]")
      .forEach(node => node.remove());
  });`,
          }}
        />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `import { injectIntoGlobalHook } from "/@react-refresh";
  injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;`,
          }}
        />
      </>
    )
  }

  return null
}

export function createApp(options: CreateAppProps) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        const App = () => {
          let { loaderData, loaderProps, css, mode } = props

          return (
            <html lang="en-US">
              <head>
                {process.env.NODE_ENV === 'development' ? (
                  <DevHead ssrID={`/@id/__x00__virtual:ssr-css.css?t=${rand()}`} />
                ) : null}

                <script
                  dangerouslySetInnerHTML={{
                    __html: `globalThis['global'] = globalThis`,
                  }}
                />

                {css?.map((file) => {
                  return <link key={file} rel="stylesheet" href={file} />
                })}
              </head>
              <body>
                <Root routes={options.routes} {...props} />
              </body>
              {/* could this just be loaded via the same loader.js? as a preload? i think so... */}
              <script
                async
                // @ts-ignore
                href="one-loader-data"
                dangerouslySetInnerHTML={{
                  __html: `
                      globalThis['__vxrnPostRenderData__'] = { __vxrn__: 'post-render' };
                      globalThis['__vxrnLoaderData__'] = ${JSON.stringify(loaderData)};
                      globalThis['__vxrnLoaderProps__'] = ${JSON.stringify(loaderProps)};
                      globalThis['__vxrnHydrateMode__'] = ${JSON.stringify(mode)};
                  `,
                }}
              />
            </html>
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

        const styleTag = Application.getStyleElement({ nonce: process.env.ONE_NONCE })

        if (styleTag) {
          const rnwStyleHTML = ReactDOMServer.renderToStaticMarkup(styleTag)
          if (rnwStyleHTML) {
            html = html.replace(`</head>`, `${rnwStyleHTML}</head>`)
          }
        }

        // now we can grab and serialize in our zero queries
        const serverData = globalThis['__vxrnServerData__']
        if (serverData) {
          const hasQueryData = Object.keys(serverData).length
          if (hasQueryData) {
            html = html.replace(`{ __vxrn__: 'post-render' }`, JSON.stringify(serverData))
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
