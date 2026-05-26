'use client'

import {
  StackActions,
  type ParamListBase,
  type StackActionHelpers,
  type StackNavigationState,
} from '@react-navigation/native'
import type {
  NativeStackNavigationEventMap,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import { NativeStackView } from '@react-navigation/native-stack'
import {
  Fragment,
  useCallback,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  convertStackStateToNonOverlayState,
  findLastNonOverlayIndex,
  isOverlayPresentation,
} from './stackStateUtils'
import {
  type StackRender,
  type StackRenderComponent,
  type StackRenderProps,
  useStackRender,
} from './ScreenRenderContext'

type RouteOptions = NativeStackNavigationOptions & {
  render?: StackRender
  keepMounted?: boolean
}

type Descriptors = Record<
  string,
  {
    options: RouteOptions
    render: () => ReactNode
    navigation: any
  }
>

type WebStackViewProps = {
  state: StackNavigationState<ParamListBase>
  navigation: StackActionHelpers<ParamListBase> & {
    dispatch: (action: any) => void
  }
  descriptors: Descriptors
  describe?: (route: any, placeholder?: boolean) => any
  eventMap?: NativeStackNavigationEventMap
}

/**
 * Resolve which render component to use for an overlay route, in order:
 *   1. options.render?.web        (per-route override)
 *   2. context.web                (Stack-level default; also fed by setupRendering)
 * Returns undefined when neither is set.
 */
export function resolveOverlayRender(
  options: RouteOptions | undefined,
  contextRender: StackRender | undefined
): StackRenderComponent | undefined {
  return options?.render?.web ?? contextRender?.web
}

type PersistentSlot = {
  routeName: string
  Render: StackRenderComponent
  options: RouteOptions
  content: ReactElement
}

export function WebStackView({
  state,
  navigation,
  descriptors,
  describe,
}: WebStackViewProps) {
  const contextRender = useStackRender()

  // Persistent slots survive route pops for routes with `keepMounted: true`.
  // Keyed by route NAME (not key) so re-navigation reuses the same mount.
  const persistentSlotsRef = useRef<Map<string, PersistentSlot>>(new Map())

  // Capture / refresh persistent slots from current descriptors.
  for (const route of state.routes) {
    const desc = descriptors[route.key]
    if (!desc) continue
    const { options } = desc
    if (!options.keepMounted) continue
    if (!isOverlayPresentation(options)) continue
    const Render = resolveOverlayRender(options, contextRender)
    if (!Render) continue
    if (persistentSlotsRef.current.has(route.name)) continue
    persistentSlotsRef.current.set(route.name, {
      routeName: route.name,
      Render,
      options,
      content: desc.render() as ReactElement,
    })
  }

  // Compute which routes are currently focused as overlays (trailing).
  const isOverlayCandidate = (options: NativeStackNavigationOptions | undefined | null) =>
    isOverlayPresentation(options) &&
    resolveOverlayRender(options ?? undefined, contextRender) !== undefined

  const nonOverlay = convertStackStateToNonOverlayState(
    state,
    descriptors,
    isOverlayCandidate
  )
  const underlyingState = {
    ...state,
    routes: nonOverlay.routes,
    index: nonOverlay.index,
  } as StackNavigationState<ParamListBase>

  const lastNonOverlay = findLastNonOverlayIndex(state, descriptors, isOverlayCandidate)
  const trailingOverlays = state.routes.slice(lastNonOverlay + 1)

  // Track which route NAMES are currently focused as a trailing overlay, so
  // persistent slots know whether to be open or just kept-mounted-hidden.
  const focusedOverlayNames = new Set(trailingOverlays.map((r) => r.name))

  // Trailing overlays that AREN'T keepMounted render in the regular slot.
  const regularOverlays = trailingOverlays.filter(
    (r) => !descriptors[r.key]?.options.keepMounted
  )

  return (
    <Fragment>
      <NativeStackView
        state={underlyingState}
        descriptors={descriptors as any}
        navigation={navigation as any}
        describe={describe as any}
      />

      {regularOverlays.map((route) => (
        <OverlayHost
          key={route.key}
          route={route}
          descriptor={descriptors[route.key]!}
          contextRender={contextRender}
          open
          onDismiss={() =>
            navigation.dispatch({
              ...StackActions.pop(),
              source: route.key,
              target: state.key,
            })
          }
        />
      ))}

      {/* Persistent slots - render once each, never unmount. `open` toggles
          based on whether the route is the current trailing overlay. */}
      {Array.from(persistentSlotsRef.current.values()).map((slot) => (
        <PersistentOverlayHost
          key={slot.routeName}
          slot={slot}
          open={focusedOverlayNames.has(slot.routeName)}
          onDismiss={() => {
            // Find the live route key for this name (if any) and pop it.
            const live = state.routes.find((r) => r.name === slot.routeName)
            if (live) {
              navigation.dispatch({
                ...StackActions.pop(),
                source: live.key,
                target: state.key,
              })
            }
          }}
        />
      ))}
    </Fragment>
  )
}

export function OverlayHost({
  route,
  descriptor,
  contextRender,
  open,
  onDismiss,
}: {
  route: { key: string; name: string }
  descriptor: Descriptors[string]
  contextRender: StackRender | undefined
  open: boolean
  onDismiss: () => void
}) {
  const dismiss = useStableCallback(onDismiss)

  const options = descriptor.options
  const Render = resolveOverlayRender(options, contextRender)
  const content = descriptor.render()

  if (!Render || !isOverlayPresentation(options)) {
    return <Fragment>{content}</Fragment>
  }

  const renderProps: StackRenderProps = {
    routeKey: route.key,
    routeName: route.name,
    presentation: options.presentation!,
    open,
    dismiss,
    dismissible: options.gestureEnabled ?? true,
    sheetAllowedDetents: options.sheetAllowedDetents,
    sheetGrabberVisible: options.sheetGrabberVisible,
    sheetCornerRadius: options.sheetCornerRadius,
    sheetInitialDetentIndex: options.sheetInitialDetentIndex,
    sheetLargestUndimmedDetentIndex: options.sheetLargestUndimmedDetentIndex,
    sheetExpandsWhenScrolledToEdge: options.sheetExpandsWhenScrolledToEdge,
    children: content,
  }

  return <Render {...renderProps} />
}

function PersistentOverlayHost({
  slot,
  open,
  onDismiss,
}: {
  slot: PersistentSlot
  open: boolean
  onDismiss: () => void
}) {
  const dismiss = useStableCallback(onDismiss)
  const { Render, options, content, routeName } = slot

  const renderProps: StackRenderProps = {
    routeKey: `__keepMounted:${routeName}`,
    routeName,
    presentation: options.presentation!,
    open,
    dismiss,
    dismissible: options.gestureEnabled ?? true,
    sheetAllowedDetents: options.sheetAllowedDetents,
    sheetGrabberVisible: options.sheetGrabberVisible,
    sheetCornerRadius: options.sheetCornerRadius,
    sheetInitialDetentIndex: options.sheetInitialDetentIndex,
    sheetLargestUndimmedDetentIndex: options.sheetLargestUndimmedDetentIndex,
    sheetExpandsWhenScrolledToEdge: options.sheetExpandsWhenScrolledToEdge,
    children: content,
  }

  return <Render {...renderProps} />
}

function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const [ref] = useState(() => ({ current: fn }))
  ref.current = fn
  return useCallback(((...args: any[]) => ref.current(...args)) as T, [ref])
}
