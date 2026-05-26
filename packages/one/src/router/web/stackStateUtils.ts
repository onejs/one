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
 * Returns the underlying navigation state for NativeStackView with the
 * trailing overlay suffix removed.
 *
 * Important: we only strip the suffix of overlay routes at the top of the
 * stack. Overlay routes that are SANDWICHED between cards (e.g. user
 * navigated forward from a sheet to a card) stay in the underlying state
 * so NativeStackView still has a complete history and downstream routes
 * keep their correct previous-route / header-back context.
 *
 * The `isOverlay` predicate defaults to `isOverlayPresentation`; callers
 * can narrow it (e.g. only routes that actually have a render component
 * configured).
 */
export function convertStackStateToNonOverlayState(
  state: StackNavigationState<ParamListBase>,
  descriptors: DescriptorMap,
  isOverlay: (
    options: NativeStackNavigationOptions | undefined | null
  ) => boolean = isOverlayPresentation
): { routes: typeof state.routes; index: number } {
  const lastNonOverlay = findLastNonOverlayIndex(state, descriptors, isOverlay)
  const routes = state.routes.slice(0, lastNonOverlay + 1)

  // If the active route was in the trailing overlay suffix, clamp the index
  // to the last route still in the underlying view.
  let index = state.index
  if (index >= routes.length) {
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
