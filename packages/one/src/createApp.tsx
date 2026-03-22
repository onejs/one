import './setup'

import { cloneElement } from 'react'
import { AppRegistry } from 'react-native'
import { resolveClientLoader } from './clientLoaderResolver'
import { Root } from './Root'
import { render } from './render'
import { initClientMatches } from './router/router'
import { registerPreloadedRoute } from './router/useViteRoutes'
import { setupSkewProtection } from './skewProtection'
import { findRootLayout } from './utils/findRootLayout'
import type { RenderAppProps } from './types'
import { getServerHeadInsertions } from './useServerHeadInsertion'
import { ensureExists } from './utils/ensureExists'
import { SERVER_CONTEXT_POST_RENDER_STRING } from './vite/constants'
import { safeJsonStringify } from './utils/htmlEscape'
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
    // cache server module imports across requests
    let cachedReactDOMServer: any
    let cachedServerRender: any
    let cachedRenderToStaticMarkup: any
    let cachedRenderToString: any
    let setupDone = false

    return {
      options,
      render: async (props: RenderAppProps) => {
        // set render mode env before setup so users can conditionally skip setup in ssg/spa
        const renderMode = props.mode === 'spa-shell' ? 'spa' : props.mode
        // only set if changed to avoid process.env setter overhead
        if (process.env.ONE_RENDER_MODE !== renderMode) {
          process.env.ONE_RENDER_MODE = renderMode
        }

        if (!setupDone && options.getSetupPromise) {
          await options.getSetupPromise()
          setupDone = true
        }

        // cache dynamic imports - only resolve once
        if (!cachedReactDOMServer) {
          const [rds, sr] = await Promise.all([
            import('react-dom/server.browser'),
            import('./server-render'),
          ])
          cachedReactDOMServer = rds
          cachedServerRender = sr
          cachedRenderToStaticMarkup =
            rds.renderToStaticMarkup || rds.default?.renderToStaticMarkup
          cachedRenderToString = sr.renderToString
        }

        const renderToStaticMarkup = cachedRenderToStaticMarkup
        const renderToString = cachedRenderToString

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

        // render Root directly, skip AppRegistry overhead on server
        const rootElement = (
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

        let html = await renderToString(rootElement, {
          preloads: props.preloads,
        })

        // post-render: inject any extra head elements (RNW styles + head insertions)
        try {
          const extraHeadElements: React.ReactElement[] = []

          // get style elements from AppRegistry (for react-native-web styles)
          try {
            AppRegistry.registerComponent('__oneStyles', () => () => null)
            // @ts-expect-error
            const app = AppRegistry.getApplication('__oneStyles', {})
            const styleTag = app.getStyleElement({
              nonce: process.env.ONE_NONCE,
            })
            if (styleTag) {
              extraHeadElements.push(styleTag)
            }
          } catch {
            // ok if no styles
          }

          if (renderId) {
            const insertions = getServerHeadInsertions(renderId)
            if (insertions) {
              for (const insertion of insertions) {
                const out = insertion()
                if (out) {
                  extraHeadElements.push(out)
                }
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
          if (!`${err}`.includes(`sheet is not defined`)) {
            throw err
          }
        }

        // replace postRenderData placeholder with actual data set during render
        const postRenderData = getServerContext()?.postRenderData
        if (postRenderData) {
          html = html.replace(
            safeJsonStringify(SERVER_CONTEXT_POST_RENDER_STRING),
            safeJsonStringify(postRenderData)
          )
        }

        return html
      },

      // streaming SSR - returns ReadableStream, no post-processing
      renderStream: async (props: RenderAppProps): Promise<ReadableStream> => {
        const renderMode = props.mode === 'spa-shell' ? 'spa' : props.mode
        // only set if changed to avoid process.env setter overhead
        if (process.env.ONE_RENDER_MODE !== renderMode) {
          process.env.ONE_RENDER_MODE = renderMode
        }

        if (!setupDone && options.getSetupPromise) {
          await options.getSetupPromise()
          setupDone = true
        }

        if (!cachedServerRender) {
          const [rds, sr] = await Promise.all([
            import('react-dom/server.browser'),
            import('./server-render'),
          ])
          cachedReactDOMServer = rds
          cachedServerRender = sr
          cachedRenderToStaticMarkup =
            rds.renderToStaticMarkup || rds.default?.renderToStaticMarkup
          cachedRenderToString = sr.renderToString
        }

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

        const rootElement = (
          <Root
            flags={options.flags}
            routes={options.routes}
            routerRoot={options.routerRoot}
            {...props}
          />
        )

        return cachedServerRender.renderToStream(rootElement, {
          preloads: props.preloads,
        })
      },
    }
  }

  // skew protection: auto-reload on chunk load failures
  if (typeof window !== 'undefined' && process.env.ONE_SKEW_PROTECTION !== 'false') {
    window.addEventListener('vite:preloadError', (e) => {
      e.preventDefault()
      const key = '__one_skew_reload'
      const last = sessionStorage.getItem(key)
      if (!last || Date.now() - Number(last) > 10_000) {
        sessionStorage.setItem(key, String(Date.now()))
        window.location.reload()
      }
    })
  }

  // skew protection: proactive version polling
  setupSkewProtection()

  const serverContext = getServerContext() || {}
  const routePreloads = serverContext.routePreloads

  // initialize client matches from server context for useMatches hook
  // restore page loaderData into matches (stripped during SSR to avoid double-serialization)
  if (serverContext.matches) {
    const restoredMatches = serverContext.matches.map((m: any) => {
      if (!m.loaderData && serverContext.loaderData) {
        return { ...m, loaderData: serverContext.loaderData }
      }
      return m
    })
    initClientMatches(restoredMatches)
  }

  // NOTE: for SSG 404 pages, we DON'T set notFoundState before initial render
  // because the server rendered the +not-found page through normal routing
  // setting notFoundState would cause useSlot to skip the layout hierarchy,
  // leading to hydration mismatch
  // notFoundState is only set for client-side navigations that result in 404

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
        const mod = await import(/* @vite-ignore */ bundlePath as string)
        registerPreloadedRoute(routeKey, mod)
        return mod
      })
    : [findRootLayout(options.routes, options.routerRoot)]

  // for 404 pages, use history.state.__tempLocation to route to notFoundPath
  // without changing the browser URL. the router checks __tempLocation and uses
  // that path for routing instead of the URL. this ensures hydration matches
  // the server-rendered +not-found page while keeping the original URL intact
  const one404Marker = (window as any).__one404
  if (one404Marker?.notFoundPath) {
    const currentState = window.history.state || {}
    window.history.replaceState(
      {
        ...currentState,
        __tempLocation: { pathname: one404Marker.notFoundPath, search: '' },
      },
      ''
    )
  }

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
