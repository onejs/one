/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/core/src/getPathFromState.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */

import {
  BaseNavigationContainer,
  getActionFromState,
  getPathFromState,
  getStateFromPath,
  type NavigationContainerProps,
  type NavigationContainerRef,
  type NavigationState,
  type ParamListBase,
  ThemeProvider,
  validatePathConfig,
} from '@react-navigation/core'
// @modified - start
// import { LinkingContext } from './LinkingContext'
// import { LocaleDirContext } from './LocaleDirContext'
// import { DefaultTheme } from './theming/DefaultTheme'
// import type { DocumentTitleOptions, LinkingOptions, LocaleDirection } from './types'
// import { UnhandledLinkingContext } from './UnhandledLinkingContext'
import {
  DefaultTheme,
  type DocumentTitleOptions,
  LinkingContext,
  type LinkingOptions,
  LocaleDirContext,
  type LocaleDirection,
} from '@react-navigation/native'
import * as React from 'react'
import { I18nManager } from 'react-native'
// @modified - end
import { useBackButton } from './useBackButton'
import { useDocumentTitle } from './useDocumentTitle'
import { useLinking } from './useLinking'
import { useThenable } from './useThenable'

// @ts-ignore - v8 declares this with listeners field, we use a simplified version
globalThis.REACT_NAVIGATION_DEVTOOLS ??= new WeakMap()

// @modified - SSR-optimized container (bypasses BaseNavigationContainer's 32+ hooks)
import { SSRNavigationContainer } from './SSRNavigationContainer'

type Props<ParamList extends {}> = NavigationContainerProps & {
  direction?: LocaleDirection
  linking?: LinkingOptions<ParamList>
  fallback?: React.ReactNode
  documentTitle?: DocumentTitleOptions
}

/**
 * Container component which holds the navigation state designed for React Native apps.
 * This should be rendered at the root wrapping the whole app.
 *
 * @param props.initialState Initial state object for the navigation tree. When deep link handling is enabled, this will override deep links when specified. Make sure that you don't specify an `initialState` when there's a deep link (`Linking.getInitialURL()`).
 * @param props.onReady Callback which is called after the navigation tree mounts.
 * @param props.onStateChange Callback which is called with the latest navigation state when it changes.
 * @param props.onUnhandledAction Callback which is called when an action is not handled.
 * @param props.direction Text direction of the components. Defaults to `'ltr'`.
 * @param props.theme Theme object for the UI elements.
 * @param props.linking Options for deep linking. Deep link handling is enabled when this prop is provided, unless `linking.enabled` is `false`.
 * @param props.fallback Fallback component to render until we have finished getting initial state when linking is enabled. Defaults to `null`.
 * @param props.documentTitle Options to configure the document title on Web. Updating document title is handled by default unless `documentTitle.enabled` is `false`.
 * @param props.children Child elements to render the content.
 * @param props.ref Ref object which refers to the navigation object containing helper methods.
 */
function NavigationContainerInner(
  props: Props<ParamListBase>,
  ref?: React.Ref<NavigationContainerRef<ParamListBase> | null>
) {
  // @modified - SSR fast path: bypass BaseNavigationContainer entirely
  // BaseNavigationContainer has 32+ hooks and 7 providers that are all
  // unnecessary on SSR (event emitters, child listeners, state sync, etc.)
  // we provide only the minimal contexts that child navigators read
  // @modified - SSR fast path: bypass BaseNavigationContainer entirely
  // eliminates 32+ hooks and reduces 8 providers to 4
  if (typeof window === 'undefined') {
    const { theme = DefaultTheme, initialState, linking, children } = props
    return (
      <SSRNavigationContainer initialState={initialState} theme={theme} linking={linking}>
        {children}
      </SSRNavigationContainer>
    )
  }

  return <NavigationContainerClientInner {...props} forwardedRef={ref} />
}

// @modified - full client NavigationContainer with all hooks and providers
function NavigationContainerClientInner({
  forwardedRef,
  direction = I18nManager.getConstants().isRTL ? 'rtl' : 'ltr',
  theme = DefaultTheme,
  linking,
  fallback = null,
  documentTitle,
  onStateChange,
  ...rest
}: Props<ParamListBase> & {
  forwardedRef?: React.Ref<NavigationContainerRef<ParamListBase> | null>
}) {
  const ref = forwardedRef
  const isLinkingEnabled = linking ? linking.enabled !== false : false

  if (linking?.config) {
    validatePathConfig(linking.config)
  }

  const refContainer = React.useRef<NavigationContainerRef<ParamListBase> | null>(null)

  useBackButton(refContainer)
  useDocumentTitle(refContainer, documentTitle)

  const { getInitialState } = useLinking(refContainer, {
    enabled: isLinkingEnabled,
    prefixes: [],
    ...linking,
  })

  // @modified - v8 pre-processes linking options into context value
  const linkingContext = React.useMemo(
    () => ({
      options: {
        ...linking,
        enabled: isLinkingEnabled,
        prefixes: linking?.prefixes ?? [],
        getStateFromPath: linking?.getStateFromPath ?? getStateFromPath,
        getPathFromState: linking?.getPathFromState ?? getPathFromState,
        getActionFromState: linking?.getActionFromState ?? getActionFromState,
      },
    }),
    [linking, isLinkingEnabled]
  )

  React.useEffect(() => {
    if (refContainer.current) {
      const previous = REACT_NAVIGATION_DEVTOOLS.get(refContainer.current)
      const listeners = (previous as any)?.listeners ?? new Set()

      REACT_NAVIGATION_DEVTOOLS.set(refContainer.current, {
        get linking() {
          return linkingContext.options
        },
        get listeners() {
          return listeners
        },
      })
    }
  })

  const [isResolved, initialState] = useThenable(getInitialState)

  if (process.env.ONE_DEBUG_ROUTER) {
    console.info(
      `[one] 🏠 NavigationContainer isResolved=${isResolved} initialState=`,
      JSON.stringify(initialState, null, 2)
    )
    console.info(`[one] 🏠 NavigationContainer rest.initialState=`, rest.initialState)
  }

  React.useImperativeHandle(ref, () => refContainer.current!)

  const isLinkingReady = rest.initialState != null || !isLinkingEnabled || isResolved

  if (!isLinkingReady) {
    return <ThemeProvider value={theme}>{fallback}</ThemeProvider>
  }

  return (
    <LocaleDirContext.Provider value={direction}>
      <LinkingContext.Provider value={linkingContext}>
        <BaseNavigationContainer
          {...rest}
          theme={theme}
          onStateChange={onStateChange}
          initialState={rest.initialState == null ? initialState : rest.initialState}
          ref={refContainer}
        />
      </LinkingContext.Provider>
    </LocaleDirContext.Provider>
  )
}

export const NavigationContainer = React.forwardRef(NavigationContainerInner) as <
  RootParamList extends {} = ParamListBase,
>(
  props: Props<RootParamList> & {
    ref?: React.Ref<NavigationContainerRef<RootParamList>>
  }
) => React.ReactElement
