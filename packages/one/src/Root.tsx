import {
  DarkTheme,
  DefaultTheme,
  type NavigationAction,
  type NavigationContainerProps,
} from '@react-navigation/native'
import { useColorScheme } from '@vxrn/universal-color-scheme'
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useId,
  useState,
  type FunctionComponent,
  type ReactNode,
} from 'react'
import { SERVER_CONTEXT_KEY } from './constants'
import { NavigationContainer as UpstreamNavigationContainer } from './fork/NavigationContainer'
import { getURL } from './getURL'
import { ServerLocationContext } from './router/serverLocationContext'
import { useInitializeOneRouter } from './router/useInitializeOneRouter'
import { useViteRoutes } from './router/useViteRoutes'
import type { GlobbedRouteImports } from './types'
import { ServerRenderID } from './useServerHeadInsertion'
import { PreloadLinks } from './views/PreloadLinks'
import { RootErrorBoundary } from './views/RootErrorBoundary'
import { ScrollBehavior } from './views/ScrollBehavior'
import type { One } from './vite/types'

type RootProps = Omit<InnerProps, 'context'> & {
  onRenderId?: (id: string) => void
  path: string
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

// we bridge it to react because reacts weird rendering loses it
const ServerAsyncLocalIDContext = createContext<One.ServerContext | null>(null)

globalThis['__vxrnGetContextFromReactContext'] = () => useContext(ServerAsyncLocalIDContext)

export function Root(props: RootProps) {
  const { path, routes, routeOptions, isClient, navigationContainerProps, onRenderId } = props

  // ⚠️ <StrictMode> breaks routing!
  const context = useViteRoutes(routes, routeOptions, globalThis['__vxrnVersion'])
  const location =
    typeof window !== 'undefined' && window.location
      ? new URL(path || window.location.href || '/', window.location.href)
      : new URL(path || '/', getURL())

  const store = useInitializeOneRouter(context, location)
  const [colorScheme] = useColorScheme()

  // const headContext = useMemo(() => globalThis['vxrn__headContext__'] || {}, [])

  const Component = store.rootComponent

  if (!Component) {
    throw new Error(`No root component found`)
  }

  const id = useId()

  onRenderId?.(id)

  const value = globalThis['__vxrnrequestAsyncLocalStore']?.getStore() || null

  console.log('wtf', value)

  const contents = (
    // <StrictMode>
    <ServerAsyncLocalIDContext.Provider value={value}>
      <ServerRenderID.Provider value={id}>
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
              {/* <GestureHandlerRootView> */}
              {/*
               * Due to static rendering we need to wrap these top level views in second wrapper
               * View's like <GestureHandlerRootView /> generate a <div> so if the parent wrapper
               * is a HTML document, we need to ensure its inside the <body>
               */}
              <>
                {/* default scroll restoration to on, but users can configure it by importing and using themselves */}
                <ScrollBehavior />

                <Component />

                {/* Users can override this by adding another StatusBar element anywhere higher in the component tree. */}
              </>
              {/* {!hasViewControllerBasedStatusBarAppearance && <StatusBar style="auto" />} */}
              {/* </GestureHandlerRootView> */}
            </ServerLocationContext.Provider>
          </UpstreamNavigationContainer>
          <PreloadLinks key="preload-links" />
        </RootErrorBoundary>
      </ServerRenderID.Provider>
    </ServerAsyncLocalIDContext.Provider>
    // </StrictMode>
  )

  if (isClient) {
    // only on client can read like this
    if (globalThis[SERVER_CONTEXT_KEY]?.mode === 'spa') {
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

  return contents
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
