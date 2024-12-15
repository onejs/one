import { SafeAreaProviderCompat } from '@react-navigation/elements'
import {
  DarkTheme,
  DefaultTheme,
  type NavigationAction,
  type NavigationContainerProps,
} from '@react-navigation/native'
import { useColorScheme } from '@vxrn/universal-color-scheme'
import { Fragment, useEffect, useState, type FunctionComponent, type ReactNode } from 'react'
import UpstreamNavigationContainer from './fork/NavigationContainer'
import { getURL } from './getURL'
import { ServerLocationContext } from './router/serverLocationContext'
import { useInitializeOneRouter } from './router/useInitializeOneRouter'
import type { GlobbedRouteImports, RenderAppProps } from './types'
import { useViteRoutes } from './useViteRoutes'
import { rand } from './utils/rand'
import { PreloadLinks } from './views/PreloadLinks'
import { RootErrorBoundary } from './views/RootErrorBoundary'
import { ScrollRestoration } from './views/ScrollRestoration'
import type { One } from './vite/types'
// import { SplashScreen } from './views/Splash'

if (typeof window !== 'undefined') {
  // @ts-ignore TODO: hard coded for demo app
  window.__getReactRefreshIgnoredExports = () => ['feedCardQuery', 'feedCardReplyQuery', 'loader']
}

type RootProps = RenderAppProps &
  Omit<InnerProps, 'context'> & {
    mode?: One.RouteRenderMode
    isClient?: boolean
    routes: GlobbedRouteImports
    routeOptions?: One.RouteOptions
  }

type InnerProps = {
  context: One.RouteContext
  location?: URL
  wrapper?: FunctionComponent<{ children: ReactNode }>
  navigationContainerProps?: NavigationContainerProps & {
    theme?: {
      dark: boolean
      colors: {
        primary: string
        background: string
        card: string
        text: string
        border: string
        notification: string
      }
    }
  }
}

export function Root(props: RootProps) {
  const {
    path,
    routes,
    routeOptions,
    wrapper: ParentWrapper = Fragment,
    isClient,
    css,
    navigationContainerProps,
    loaderProps,
    mode,
  } = props

  // ⚠️ <StrictMode> breaks routing!
  const context = useViteRoutes(routes, routeOptions, globalThis['__vxrnVersion'])
  const location =
    typeof window !== 'undefined' && window.location
      ? new URL(path || window.location.href || '/', window.location.href)
      : new URL(path || '/', getURL())

  const store = useInitializeOneRouter(context, location)
  const [colorScheme] = useColorScheme()

  // const headContext = useMemo(() => globalThis['vxrn__headContext__'] || {}, [])

  /*
   * Due to static rendering we need to wrap these top level views in second wrapper
   * View's like <GestureHandlerRootView /> generate a <div> so if the parent wrapper
   * is a HTML document, we need to ensure its inside the <body>
   */
  const wrapper = (children: any) => {
    return (
      <ParentWrapper>
        {/* default scroll restoration to on, but users can configure it by importing and using themselves */}
        <ScrollRestoration />
        {/* <GestureHandlerRootView> */}
        <SafeAreaProviderCompat>
          {children}

          {/* Users can override this by adding another StatusBar element anywhere higher in the component tree. */}
          {/* {!hasViewControllerBasedStatusBarAppearance && <StatusBar style="auto" />} */}
        </SafeAreaProviderCompat>
        {/* </GestureHandlerRootView> */}
      </ParentWrapper>
    )
  }

  const Component = store.rootComponent

  if (!Component) {
    throw new Error(`No root component found`)
  }

  const contents = (
    // <StrictMode>
    <RootErrorBoundary>
      {/* for some reason warning if no key here */}
      <UpstreamNavigationContainer
        ref={store.navigationRef}
        initialState={store.initialState}
        linking={store.linking}
        onUnhandledAction={onUnhandledAction}
        theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        documentTitle={{
          enabled: false,
        }}
        {...navigationContainerProps}
      >
        <ServerLocationContext.Provider value={location}>
          {wrapper(<Component />)}
        </ServerLocationContext.Provider>
      </UpstreamNavigationContainer>
      <PreloadLinks key="preload-links" />
    </RootErrorBoundary>
    // </StrictMode>
  )

  if (isClient) {
    if (globalThis['__vxrnHydrateMode__'] === 'spa') {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [show, setShow] = useState(false)

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        setShow(true)
      }, [])

      return show ? contents : null
    }
    return contents
  }

  let { loaderData } = props
  // If loaderData is a zql QueryImpl we don't want to send it to the client,
  // as it will be stringified into an empty object `{}` and mess up the client-side cache.
  if (loaderData?.constructor?.name === 'QueryImpl') {
    loaderData = undefined
  }

  return (
    <html lang="en-US">
      <head>
        {process.env.NODE_ENV === 'development' ? <DevHead /> : null}

        <script
          dangerouslySetInnerHTML={{
            __html: `globalThis['global'] = globalThis`,
          }}
        />

        {css?.map((file) => {
          return <link key={file} rel="stylesheet" href={file} />
        })}
      </head>
      <body>{contents}</body>
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

const ssrCSSID = `/@id/__x00__virtual:ssr-css.css?t=${rand()}`

function DevHead() {
  return (
    <>
      <link rel="preload" href={ssrCSSID} as="style" />
      <link rel="stylesheet" href={ssrCSSID} data-ssr-css />
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

// function getGestureHandlerRootView() {
//   if (process.env.TAMAGUI_TARGET === 'native') {
//     try {
//       if (!_GestureHandlerRootView) {
//         return Fragment
//       }

//       // eslint-disable-next-line no-inner-declarations
//       function GestureHandler(props: any) {
//         return <_GestureHandlerRootView style={{ flex: 1 }} {...props} />
//       }
//       if (process.env.NODE_ENV === 'development') {
//         // @ts-expect-error
//         GestureHandler.displayName = 'GestureHandlerRootView'
//       }
//       return GestureHandler
//     } catch {
//       return Fragment
//     }
//   }

//   return Fragment
// }

// const GestureHandlerRootView = getGestureHandlerRootView()

// const INITIAL_METRICS = {
//   frame: { x: 0, y: 0, width: 0, height: 0 },
//   insets: { top: 0, left: 0, right: 0, bottom: 0 },
// }

// const hasViewControllerBasedStatusBarAppearance =
//   Platform.OS === 'ios' &&
//   !!Constants.expoConfig?.ios?.infoPlist?.UIViewControllerBasedStatusBarAppearance

let onUnhandledAction: (action: NavigationAction) => void

if (process.env.NODE_ENV !== 'production') {
  onUnhandledAction = (action: NavigationAction) => {
    const payload: Record<string, any> | undefined = action.payload

    let message = `The action '${action.type}'${
      payload ? ` with payload ${JSON.stringify(action.payload)}` : ''
    } was not handled by any navigator.`

    switch (action.type) {
      case 'NAVIGATE':
      case 'PUSH':
      case 'REPLACE':
      case 'JUMP_TO':
        if (payload?.name) {
          message += `\n\nDo you have a route named '${payload.name}'?`
        } else {
          message += `\n\nYou need to pass the name of the screen to navigate to. This may be a bug.`
        }

        break
      case 'GO_BACK':
      case 'POP':
      case 'POP_TO_TOP':
        message += `\n\nIs there any screen to go back to?`
        break
      case 'OPEN_DRAWER':
      case 'CLOSE_DRAWER':
      case 'TOGGLE_DRAWER':
        message += `\n\nIs your screen inside a Drawer navigator?`
        break
    }

    message += `\n\nThis is a development-only warning and won't be shown in production.`

    if (process.env.NODE_ENV === 'test') {
      throw new Error(message)
    }
    console.error(message)
  }
} else {
  onUnhandledAction = () => {}
}

// if getting element type is undefined
// this helped debug some hard to debug ish
// // its so hard to debug ssr and we get no componentstack trace, this helps:
// if (typeof window === 'undefined') {
//   const og = React.createElement
//   // @ts-ignore
//   React.createElement = (...args) => {
//     if (!args[0]) {
//       console.trace('Missing export, better stack trace here', !!args[0])
//     }
//     // @ts-ignore
//     return og(...args)
//   }

//   const og2 = JSX.jsx
//   // @ts-ignore
//   JSX.jsx = (...args) => {
//     if (!args[0]) {
//       console.trace('Missing export, better stack trace here', !!args[0])
//     }
//     // @ts-ignore
//     return og2(...args)
//   }
// }
