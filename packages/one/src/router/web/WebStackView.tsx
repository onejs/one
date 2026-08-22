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
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import useLatestCallback from 'use-latest-callback'

import { devHeadlessNote } from '../../headless/devHeadlessNote'
import { useWebPresentations } from '../../headless/Presentations'
import type {
  ModalPresentationOptions,
  ScreenEntry,
  SheetPresentationOptions,
  WebPresentations,
} from '../../headless/types'
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

export function WebStackView({
  state,
  navigation,
  descriptors,
  customChildren,
}: WebStackViewProps) {
  return (
    <StackStateProvider
      state={state}
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
  const presentations = useWebPresentations()

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

      {overlayRoutes.map((route) => {
        const screen = stack.screens.find((entry) => entry.key === route.key)
        const type = getPresentationType(descriptors[route.key]?.options)
        if (!screen || !type) return null

        return (
          <PresentationScreen
            key={route.key}
            screen={screen}
            type={type}
            presentations={presentations}
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
    </Fragment>
  )
}

function PresentationScreen({
  screen,
  type,
  presentations,
  onDismiss,
}: {
  screen: ScreenEntry
  type: 'sheet' | 'modal'
  presentations: WebPresentations | undefined
  onDismiss: () => void
}) {
  const dismiss = useLatestCallback(onDismiss)
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) dismiss()
    },
    [dismiss]
  )
  // mount closed and open on the next commit, so sheet/modal components that
  // animate on a false -> true transition still play their enter animation
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(true), [])

  if (type === 'sheet') {
    const Sheet = presentations?.sheet
    if (!Sheet) return screen.element
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        options={screen.options as SheetPresentationOptions}
        screen={screen}
      >
        {screen.element}
      </Sheet>
    )
  }

  const Modal = presentations?.modal
  if (!Modal) return screen.element
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      options={screen.options as ModalPresentationOptions}
      screen={screen}
    >
      {screen.element}
    </Modal>
  )
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
