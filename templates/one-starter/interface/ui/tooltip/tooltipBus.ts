// non-component exports for the tooltip owner, extracted so Tooltip.tsx stays
// React-only and Vite Fast Refresh stays clean. mixing the emitter +
// setAllTooltipsDisabled with the React components on the same module made
// every HMR update touching Tooltip — and Tooltip has 16 importers — fall
// through to a full page reload.

import { createEmitter, isEqualIdentity } from '@o/helpers'
import type { ComponentProps } from 'react'
import type React from 'react'
import type {
  Tooltip as TamaguiTooltip,
  TooltipProps as TamaguiTooltipProps,
} from 'tamagui'

export type TooltipProps = TamaguiTooltipProps & {
  disableAllTooltips?: boolean
  disabled?: boolean
  label?: React.ReactNode
  children?: React.ReactNode
  contentProps?: ComponentProps<typeof TamaguiTooltip.Content>
}

export const globalTooltip = createEmitter<TooltipProps | null | false>(
  'global-tooltip',
  null,
  { comparator: isEqualIdentity },
)

/**
 * which trigger element owns the live tooltip.
 *
 * a leave/blur has to know the tooltip it is closing is its own, and the
 * obvious test — is the emitted value still MY props object — is wrong: props
 * is a fresh object on every render, so any re-render between enter and leave
 * leaves the leave handler holding an object the bus has never seen. it then
 * declines to close a tooltip that is plainly its own, and the tooltip sits
 * there until something unrelated clears it. that is the whole of the
 * "tooltip stays up after the pointer moves away" bug, and it fires most often
 * over surfaces whose hover updates app state (an f2c pane) because those are
 * the re-renders that land mid-gesture.
 *
 * the trigger element is stable across renders, so ownership keys on it.
 */
// the trigger hands over the element it fired on; ownership compares it by
// identity and asks whether it is still mounted, nothing dom-specific
export type TooltipTriggerElement = {
  contains?: (node: unknown) => boolean
  isConnected?: boolean
}
export const tooltipOwner: { current: TooltipTriggerElement | null } = { current: null }

// crossing between adjacent triggers fires leave -> enter in separate event
// batches. an immediate null emit commits open=false between them, and with
// exit '0ms' the content can unmount for a frame — the bubble flickers and
// loses position continuity mid-toolbar. defer the close by a short grace
// window instead: an enter within the window cancels it, while actually
// leaving the surface still closes promptly.
let pendingClose: ReturnType<typeof setTimeout> | null = null

export function cancelPendingTooltipClose() {
  if (pendingClose != null) {
    clearTimeout(pendingClose)
    pendingClose = null
  }
}

export function openGlobalTooltip(props: TooltipProps) {
  cancelPendingTooltipClose()
  globalTooltip.emit(props)
}

export function closeGlobalTooltipDeferred() {
  cancelPendingTooltipClose()
  pendingClose = setTimeout(() => {
    pendingClose = null
    if (globalTooltip.value !== false) {
      globalTooltip.emit(null)
    }
  }, 100)
}

export function setAllTooltipsDisabled(val: boolean) {
  tooltipOwner.current = null
  cancelPendingTooltipClose()
  globalTooltip.emit(val ? false : null)
}
