'use client'

import type { ParamListBase } from '@react-navigation/core'
import {
  StackActions,
  type StackActionHelpers,
  type StackNavigationState,
} from '@react-navigation/routers'
import type {
  NativeStackNavigationEventMap,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import {
  Activity,
  Fragment,
  useCallback,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react'
import useLatestCallback from 'use-latest-callback'

import { devHeadlessNote } from '../../headless/devHeadlessNote'
import { useNavigationRenderWeb } from '../../headless/NavigationRender'
import type { NavigationRenderOpts, ScreenEntry } from '../../headless/types'
import {
  StackStateProvider,
  useStack,
  type HeadlessStackDescriptors,
} from '../../headless/useStack'
import { findLastNonOverlayIndex } from './stackStateUtils'

type RouteOptions = Omit<NativeStackNavigationOptions, 'presentation'> & {
  keepMounted?: boolean
  presentation?: NativeStackNavigationOptions['presentation'] | 'sheet' | string
}

type Descriptors = Record<
  string,
  {
    options: RouteOptions
    render: () => ReactElement
    navigation: any
  }
>

type WebStackViewProps = {
  state: StackNavigationState<ParamListBase>
  navigation: StackActionHelpers<ParamListBase> & {
    goBack: () => void
    dispatch: (action: any) => void
  }
  descriptors: Descriptors
  customChildren?: ReactNode[]
  eventMap?: NativeStackNavigationEventMap
}

type PersistentScreen = {
  routeName: string
  screen: ScreenEntry
}

export function WebStackView({
  state,
  navigation,
  descriptors,
  customChildren,
}: WebStackViewProps) {
  return (
    <StackStateProvider
      state={state}
      navigation={navigation}
      descriptors={descriptors as HeadlessStackDescriptors}
    >
      <HeadlessStackView
        state={state}
        navigation={navigation}
        descriptors={descriptors}
        customChildren={customChildren}
      />
    </StackStateProvider>
  )
}

function HeadlessStackView({
  state,
  navigation,
  descriptors,
  customChildren,
}: WebStackViewProps) {
  const stack = useStack()
  const renderWeb = useNavigationRenderWeb()
  const persistentScreens = useRef<Map<string, PersistentScreen>>(new Map())

  if (customChildren?.length) {
    return <Fragment>{customChildren}</Fragment>
  }

  devHeadlessNote('Stack')

  const lastBaseIndex = findLastNonOverlayIndex(
    state,
    descriptors,
    (options) => getPresentationType(options) !== undefined
  )
  const baseRouteKeys = new Set(
    state.routes.slice(0, lastBaseIndex + 1).map((route) => route.key)
  )
  const baseFocusedKey = state.routes[lastBaseIndex]?.key
  const overlayRoutes = state.routes.slice(lastBaseIndex + 1)
  const overlayRouteNames = new Set(overlayRoutes.map((route) => route.name))

  for (const screen of stack.screens) {
    if (
      screen.keepMounted &&
      getPresentationType(screen.options) &&
      !persistentScreens.current.has(screen.name)
    ) {
      persistentScreens.current.set(screen.name, {
        routeName: screen.name,
        screen,
      })
    }
  }

  return (
    <Fragment>
      {stack.screens.map((screen) => {
        if (!baseRouteKeys.has(screen.key)) return null

        if (screen.key === baseFocusedKey) {
          return screen.keepMounted ? (
            <Activity key={screen.key} mode="visible">
              {screen.element}
            </Activity>
          ) : (
            <Fragment key={screen.key}>{screen.element}</Fragment>
          )
        }

        if (!screen.keepMounted) return null

        return (
          <Activity key={screen.key} mode="hidden">
            {screen.element}
          </Activity>
        )
      })}

      {overlayRoutes
        .filter((route) => !descriptors[route.key]?.options.keepMounted)
        .map((route) => {
          const screen = stack.screens.find((entry) => entry.key === route.key)
          const type = getPresentationType(descriptors[route.key]?.options)
          if (!screen || !type) return null

          return (
            <PresentationScreen
              key={route.key}
              screen={screen}
              type={type}
              open
              renderWeb={renderWeb}
              onDismiss={() =>
                navigation.dispatch({
                  ...StackActions.pop(),
                  source: route.key,
                  target: state.key,
                })
              }
            />
          )
        })}

      {Array.from(persistentScreens.current.values()).map((slot) => {
        const open = overlayRouteNames.has(slot.routeName)
        return (
          <PresentationScreen
            key={slot.routeName}
            screen={slot.screen}
            type={getPresentationType(slot.screen.options)!}
            open={open}
            renderWeb={renderWeb}
            onDismiss={() => {
              const route = state.routes.find((route) => route.name === slot.routeName)
              if (route) {
                navigation.dispatch({
                  ...StackActions.pop(),
                  source: route.key,
                  target: state.key,
                })
              }
            }}
          />
        )
      })}
    </Fragment>
  )
}

function PresentationScreen({
  screen,
  type,
  open,
  renderWeb,
  onDismiss,
}: {
  screen: ScreenEntry
  type: 'sheet' | 'modal'
  open: boolean
  renderWeb: ReturnType<typeof useNavigationRenderWeb>
  onDismiss: () => void
}) {
  const dismiss = useLatestCallback(onDismiss)
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) dismiss()
    },
    [dismiss]
  )
  const opts: NavigationRenderOpts =
    type === 'sheet'
      ? {
          type,
          open,
          onOpenChange,
          options: {
            sheetAllowedDetents: screen.options.sheetAllowedDetents,
            sheetGrabberVisible: screen.options.sheetGrabberVisible,
            sheetCornerRadius: screen.options.sheetCornerRadius,
            sheetExpandsWhenScrolledToEdge: screen.options.sheetExpandsWhenScrolledToEdge,
            gestureEnabled: screen.options.gestureEnabled,
            title: screen.options.title,
          },
          screen,
          children: screen.element,
        }
      : {
          type,
          open,
          onOpenChange,
          options: {
            gestureEnabled: screen.options.gestureEnabled,
            title: screen.options.title,
          },
          screen,
          children: screen.element,
        }
  const rendered = renderWeb?.(opts)
  const content = rendered ?? screen.element

  if (screen.keepMounted) {
    return <Activity mode={open ? 'visible' : 'hidden'}>{content}</Activity>
  }

  return content
}

function getPresentationType(
  options: { presentation?: string } | undefined | null
): 'sheet' | 'modal' | undefined {
  const presentation = options?.presentation
  if (!presentation || presentation === 'card' || presentation === 'push') {
    return undefined
  }
  if (
    presentation === 'sheet' ||
    presentation === 'formSheet' ||
    presentation === 'pageSheet'
  ) {
    return 'sheet'
  }
  return 'modal'
}
