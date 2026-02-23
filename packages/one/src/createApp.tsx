import './setup'

import { cloneElement } from 'react'
import { AppRegistry } from 'react-native'
import { resolveClientLoader } from './clientLoaderResolver'
import { setNotFoundState } from './notFoundState'
import { Root } from './Root'
import { render } from './render'
import { initClientMatches } from './router/router'
import { registerPreloadedRoute } from './router/useViteRoutes'
import type { RenderAppProps } from './types'
import { getServerHeadInsertions } from './useServerHeadInsertion'
import { ensureExists } from './utils/ensureExists'
import { safeJsonStringify } from './utils/htmlEscape'
import { SERVER_CONTEXT_POST_RENDER_STRING } from './vite/constants'
import { getServerContext, setServerContext } from './vite/one-server-only'
import type { One } from './vite/types'

export type CreateAppProps = {
  routes: Record<string, () => Promise<unknown>>
  routerRoot: string
  flags?: One.Flags
  /**
   * Lazy function that returns a promise for the setup file import.
   * Called at runtime (not build time) to ensure setup code only runs when the app starts.
   */
  getSetupPromise?: () => Promise<unknown>
}

export function createApp(options: CreateAppProps) {
  if (import.meta.env.SSR) {
    return {
      options,
      render: async (props: RenderAppProps) => {
        // set render mode env before setup so users can conditionally skip setup in ssg/spa
        const renderMode = props.mode === 'spa-shell' ? 'spa' : props.mode
        process.env.ONE_RENDER_MODE = renderMode

        if (options.getSetupPromise) {
          await options.getSetupPromise()
        }

        // Dynamic imports for server-only modules to avoid bundling in client
        const [ReactDOMServer, serverRender] = await Promise.all([
          import('react-dom/server.browser'),
          import('./server-render'),
        ])

        const renderToStaticMarkup =
          ReactDOMServer.renderToStaticMarkup ||
          ReactDOMServer.default?.renderToStaticMarkup
        const renderToString = serverRender.renderToString

        const {
          loaderData,
          loaderProps,
          css,
          cssContents,
          mode,
          loaderServerData,
          routePreloads,
          matches,
        } = props

        setServerContext({
          postRenderData: loaderServerData,
          loaderData,
          loaderProps,
          mode,
          css,
          cssContents,
          routePreloads,
          matches,
        })

        let renderId: string | undefined

        const App = () => {
          return (
            <Root
              flags={options.flags}
              onRenderId={(id) => {
                renderId = id
              }}
              routes={options.routes}
              routerRoot={options.routerRoot}
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
          deferredPreloads: props.deferredPreloads,
        })

        try {
          const extraHeadElements: React.ReactElement[] = []

          const styleTag = Application.getStyleElement({
            nonce: process.env.ONE_NONCE,
          })
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
            const extraHeadHTML = renderToStaticMarkup(
              <>{extraHeadElements.map((x, i) => cloneElement(x, { key: i }))}</>
            )

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
            safeJsonStringify(SERVER_CONTEXT_POST_RENDER_STRING),
            safeJsonStringify(postRenderData)
          )
        }

        return html
      },
    }
  }

  const serverContext = getServerContext() || {}
  const routePreloads = serverContext.routePreloads

  // initialize client matches from server context for useMatches hook
  if (serverContext.matches) {
    initClientMatches(serverContext.matches)
  }

  // if server returned 404 error, set notFoundState before rendering
  // this ensures hydration renders the +not-found content, not the original route
  // check both loaderData error flag and window marker (for SSG 404 HTML serving)
  const loaderData = serverContext.loaderData
  const one404Marker = (window as any).__one404
  if (loaderData?.__oneError === 404 || one404Marker) {
    const currentPath = window.location.pathname
    setNotFoundState({
      notFoundPath:
        one404Marker?.notFoundPath || loaderData?.__oneNotFoundPath || '/+not-found',
      notFoundRouteNode: undefined, // will be resolved at render time
      originalPath: one404Marker?.originalPath || currentPath,
    })
  }

  // Wait for setup file to complete first (if provided)
  // This ensures setup code (error handlers, analytics, etc.) runs before the app
  // The function is called here at runtime, not at module evaluation time during build
  const setupComplete = options.getSetupPromise
    ? options.getSetupPromise()
    : Promise.resolve()

  // preload routes using build-time mapping (production SSG)
  // for SPA/dev mode, fall back to importing root layout directly
  const preloadPromises = routePreloads
    ? Object.entries(routePreloads).map(async ([routeKey, bundlePath]) => {
        const mod = await import(/* @vite-ignore */ bundlePath)
        registerPreloadedRoute(routeKey, mod)
        return mod
      })
    : [options.routes[`/${options.routerRoot}/_layout.tsx`]?.()]

  return setupComplete
    .then(() => Promise.all(preloadPromises))
    .then(() => {
      return resolveClientLoader(serverContext)
    })
    .then(() => {
      render(
        <Root
          isClient
          flags={options.flags}
          routes={options.routes}
          routerRoot={options.routerRoot}
          path={window.location.href}
        />
      )
    })
    .catch((err) => {
      console.error(`Error during client initialization:`, err)
    })
}
