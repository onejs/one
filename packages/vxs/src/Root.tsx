import React, {
  Fragment,
  StrictMode,
  Suspense,
  useMemo,
  useState,
  type FunctionComponent,
  type ReactNode,
} from 'react'
import { Platform } from 'react-native'
import Constants from './constants'
import type { GlobbedRouteImports } from './types'
import { useViteRoutes } from './useViteRoutes'
import { RootErrorBoundary } from './views/RootErrorBoundary'
// import { GestureHandlerRootView as _GestureHandlerRootView } from 'react-native-gesture-handler'
import type { NavigationAction, NavigationContainerProps } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import UpstreamNavigationContainer from './fork/NavigationContainer'
import { ServerLocationContext } from './global-state/serverLocationContext'
import { useInitializeExpoRouter } from './global-state/useInitializeExpoRouter'
import type { RequireContext } from './types'
import { SplashScreen } from './views/Splash'

type RootProps = Omit<InnerProps, 'context'> & {
  routes: GlobbedRouteImports
  path?: string
}

type InnerProps = {
  context: RequireContext
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
  // ⚠️ <StrictMode> breaks routing!
  return (
    <RootErrorBoundary>
      <>
        <Suspense fallback={null}>
          <Contents {...props} />
        </Suspense>
      </>
    </RootErrorBoundary>
  )
}

function Contents({ routes, path, wrapper = Fragment, ...props }: RootProps) {
  const context = useViteRoutes(routes, globalThis['__vxrnVersion'])
  const location =
    typeof window !== 'undefined'
      ? new URL(path || window.location.pathname || '/', window.location.href)
      : new URL(path || '/', 'http://localhost')

  return <ContextNavigator {...props} location={location} context={context} wrapper={wrapper} />
}

// function getGestureHandlerRootView() {
//   try {
//     if (!_GestureHandlerRootView) {
//       return React.Fragment
//     }

//     // eslint-disable-next-line no-inner-declarations
//     function GestureHandler(props: any) {
//       return <_GestureHandlerRootView style={{ flex: 1 }} {...props} />
//     }
//     if (process.env.NODE_ENV === 'development') {
//       // @ts-expect-error
//       GestureHandler.displayName = 'GestureHandlerRootView'
//     }
//     return GestureHandler
//   } catch {
//     return React.Fragment
//   }
// }

// const GestureHandlerRootView = getGestureHandlerRootView()

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

const hasViewControllerBasedStatusBarAppearance =
  Platform.OS === 'ios' &&
  !!Constants.expoConfig?.ios?.infoPlist?.UIViewControllerBasedStatusBarAppearance

const initialUrl =
  Platform.OS === 'web' && typeof window !== 'undefined' ? new URL(window.location.href) : undefined

function ContextNavigator({
  wrapper: ParentWrapper = Fragment,
  context,
  location: initialLocation = initialUrl,
  navigationContainerProps,
}: InnerProps) {
  const store = useInitializeExpoRouter(context, initialLocation)

  const headContext = useMemo(() => globalThis['vxrn__headContext__'] || {}, [])

  /*
   * Due to static rendering we need to wrap these top level views in second wrapper
   * View's like <GestureHandlerRootView /> generate a <div> so if the parent wrapper
   * is a HTML document, we need to ensure its inside the <body>
   */
  const wrapper = (children: any) => {
    return (
      // <HeadProvider context={headContext.current}>
      <ParentWrapper>
        {/* <GestureHandlerRootView> */}
        {/* <SafeAreaProvider
          // SSR support
          initialMetrics={INITIAL_METRICS}
          style={{
            flex: 1,
          }}
        > */}
        {children}

        {/* Users can override this by adding another StatusBar element anywhere higher in the component tree. */}
        {/* {!hasViewControllerBasedStatusBarAppearance && <StatusBar style="auto" />} */}
        {/* </SafeAreaProvider> */}
        {/* </GestureHandlerRootView> */}
      </ParentWrapper>
      // </HeadProvider>
    )
  }

  if (store.shouldShowTutorial()) {
    SplashScreen.hideAsync()
    if (process.env.NODE_ENV === 'development') {
      return wrapper(
        <>
          {/* TODO */}
          {/* <Tutorial /> */}
          <React.Fragment />
        </>
      )
    }
    // Ensure tutorial styles are stripped in production.
    return null
  }

  const Component = store.rootComponent

  if (!Component) {
    throw new Error(`No root component found`)
  }

  return (
    <UpstreamNavigationContainer
      ref={store.navigationRef}
      initialState={store.initialState}
      linking={store.linking}
      onUnhandledAction={onUnhandledAction}
      documentTitle={{
        enabled: false,
      }}
      {...navigationContainerProps}
    >
      <ServerLocationContext.Provider value={initialLocation}>
        {wrapper(<Component />)}
      </ServerLocationContext.Provider>
    </UpstreamNavigationContainer>
  )
}

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
