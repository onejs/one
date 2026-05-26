import type { ParamListBase, StackNavigationState } from '@react-navigation/native'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

const OVERLAY_PRESENTATIONS = [
  'modal',
  'transparentModal',
  'fullScreenModal',
  'formSheet',
  'pageSheet',
  'containedModal',
  'containedTransparentModal',
] as const

type OverlayPresentation = (typeof OVERLAY_PRESENTATIONS)[number]

type DescriptorMap = Record<string, { options: NativeStackNavigationOptions }>

export function isOverlayPresentation(
  options: NativeStackNavigationOptions | undefined | null
): boolean {
  const presentation = options?.presentation
  if (!presentation) return false
  return (OVERLAY_PRESENTATIONS as readonly string[]).includes(presentation)
}

export function isTransparentOverlay(
  options: NativeStackNavigationOptions | undefined | null
): boolean {
  const presentation = options?.presentation
  return (
    presentation === 'transparentModal' || presentation === 'containedTransparentModal'
  )
}

/**
 * Returns a copy of the navigation state with overlay routes stripped so the
 * underlying NativeStackView never tries to render a screen that is being
 * shown in an overlay slot. The index is recalculated to still point at the
 * currently-active non-overlay route (or the last remaining route if the
 * active one was an overlay).
 *
 * The `isOverlay` predicate decides which routes to peel off. Defaults to
 * `isOverlayPresentation`; callers can narrow it (e.g. only routes that
 * actually have a render component configured).
 */
export function convertStackStateToNonOverlayState(
  state: StackNavigationState<ParamListBase>,
  descriptors: DescriptorMap,
  isOverlay: (
    options: NativeStackNavigationOptions | undefined | null
  ) => boolean = isOverlayPresentation
): { routes: typeof state.routes; index: number } {
  const routes = state.routes.filter(
    (route) => !isOverlay(descriptors[route.key]?.options)
  )

  let index = routes.findIndex((r) => r.key === state.routes[state.index]?.key)
  if (index < 0) {
    index = routes.length > 0 ? routes.length - 1 : 0
  }

  return { routes, index }
}

/**
 * Index of the last route that is NOT an overlay. Returns -1 if every route
 * is an overlay. Accepts the same predicate as
 * `convertStackStateToNonOverlayState`.
 */
export function findLastNonOverlayIndex(
  state: StackNavigationState<ParamListBase>,
  descriptors: DescriptorMap,
  isOverlay: (
    options: NativeStackNavigationOptions | undefined | null
  ) => boolean = isOverlayPresentation
): number {
  for (let i = state.routes.length - 1; i >= 0; i--) {
    if (!isOverlay(descriptors[state.routes[i]!.key]?.options)) {
      return i
    }
  }
  return -1
}

export type { OverlayPresentation }
