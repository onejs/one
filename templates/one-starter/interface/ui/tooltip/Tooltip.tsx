// global tooltip with popover coordination
// adapted from ~/chat global emitter pattern
//
// non-component exports (globalTooltip, setAllTooltipsDisabled) live in
// ./tooltipBus and the wrapWithTooltip helper lives in ./tooltipHelpers so
// this file is React-only and stays a clean Vite Fast Refresh boundary for
// its 16 importers.

import { useEmitterSelector, useEmitterValue } from '@o/helpers'
import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  useEffect,
  useLayoutEffect,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { isWeb, Paragraph, Tooltip as TamaguiTooltip, View } from 'tamagui'
import { useHardwareBackHandler } from '../keyboard/hardwareBack'
import { overlayOpenEmitter } from '../overlay/overlayOpenBus'
import { popoverEmitter } from '../popover/Popover'
import { closeOpenTooltips } from './closeOpenTooltips'
import {
  closeGlobalTooltipDeferred,
  globalTooltip,
  openGlobalTooltip,
  tooltipOwner,
  type TooltipProps,
  type TooltipTriggerElement,
} from './tooltipBus'
import type React from 'react'

export type { TooltipProps } from './tooltipBus'

const TooltipTrigger = TamaguiTooltip.Trigger
const TooltipContent = TamaguiTooltip.Content
const TooltipArrow = TamaguiTooltip.Arrow
const PASSIVE_TOOLTIP_CONTENT = {
  focus: true,
  'remove-scroll': true,
  dismiss: true,
} as const
const TOOLTIP_TRANSITION = {
  preset: 'quickestLessBouncy',
  exit: '0ms',
  properties: 'transform, opacity, width, height',
} as const
type TooltipTriggerChildProps = {
  onBlur?: (event: FocusEvent<TooltipTriggerElement>) => void
  onFocus?: (event: FocusEvent<TooltipTriggerElement>) => void
  onMouseEnter?: (event: MouseEvent<TooltipTriggerElement>) => void
  onMouseLeave?: (event: MouseEvent<TooltipTriggerElement>) => void
  onLongPress?: (event: PressEvent<TooltipTriggerElement>) => void
  onPress?: (event: PressEvent<TooltipTriggerElement>) => void
}

// the touch shape of a press event: only what the handlers below read, so
// the same code runs on the native gesture event and the web synthesis.
type PressEvent<T> = {
  currentTarget: T
  defaultPrevented?: boolean
}

export const Tooltip: React.FC<TooltipProps> = memo((props) => {
  'use no memo'

  const { children, label, disabled, disableAllTooltips } = props
  const onlyChild = Children.only(children)

  // hover, keyboard focus, and a touch long press each claim the tooltip for
  // their trigger; leave, blur, and a tap on the trigger each give it back
  const claim = (event: {
    currentTarget: TooltipTriggerElement
    defaultPrevented?: boolean
  }) => {
    if (event.defaultPrevented || disabled || disableAllTooltips) return
    tooltipOwner.current = event.currentTarget
    openGlobalTooltip(props)
  }
  const release = (owner: TooltipTriggerElement) => {
    if (tooltipOwner.current !== owner) return
    tooltipOwner.current = null
    closeGlobalTooltipDeferred()
  }

  const child = isValidElement<TooltipTriggerChildProps>(onlyChild)
    ? cloneElement(onlyChild, {
        onMouseEnter: (event) => {
          onlyChild.props.onMouseEnter?.(event)
          claim(event)
        },
        onMouseLeave: (event) => {
          onlyChild.props.onMouseLeave?.(event)
          if (event.defaultPrevented) return
          // focus only holds the tooltip open when it is KEYBOARD focus
          // (:focus-visible). chrome focuses buttons on mouse click, so
          // without that distinction click-then-unhover strands the bubble
          // over the control until the next blur.
          const activeElement = isWeb ? document.activeElement : null
          const heldByKeyboardFocus =
            activeElement instanceof HTMLElement &&
            Boolean(event.currentTarget.contains?.(activeElement)) &&
            activeElement.matches(':focus-visible')
          if (!heldByKeyboardFocus) release(event.currentTarget)
        },
        onFocus: (event) => {
          onlyChild.props.onFocus?.(event)
          claim(event)
        },
        onBlur: (event) => {
          onlyChild.props.onBlur?.(event)
          if (event.defaultPrevented) return
          // focus moving within the trigger keeps it
          if (event.relatedTarget && event.currentTarget.contains?.(event.relatedTarget))
            return
          release(event.currentTarget)
        },
        // the touch trigger: hover and focus never fire from a finger, so on
        // native a long press opens and a tap on the trigger dismisses. on
        // web the document click listener already closes on tap, and a
        // long press there just re-opens what hover opened.
        onLongPress: (event) => {
          onlyChild.props.onLongPress?.(event)
          claim(event)
        },
        onPress: (event) => {
          onlyChild.props.onPress?.(event)
          if (!event.defaultPrevented) release(event.currentTarget)
        },
      })
    : onlyChild

  // a trigger removed from the DOM while owning the tooltip fires no
  // mouseleave, so the bubble would sit open over nothing until an unrelated
  // click (the pane-chip close button unmounts its whole pane this way).
  // passive cleanup runs after the node is detached, so isConnected is the
  // discriminator between "unmounted while owning" and an ordinary re-render.
  useEffect(() => {
    return () => {
      const owner = tooltipOwner.current
      if (owner && !owner.isConnected) {
        tooltipOwner.current = null
        closeGlobalTooltipDeferred()
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (disableAllTooltips) {
      globalTooltip.emit(false)
      return () => {
        globalTooltip.emit(null)
      }
    }

    if (globalTooltip.value === false) {
      return
    }

    const isActive = globalTooltip.value?.label === props?.label
    if (disabled && isActive) {
      globalTooltip.emit(null)
    }
  }, [props, disabled, disableAllTooltips])

  return (
    <TooltipTrigger
      scope="tooltip"
      {...(typeof label === 'string' && {
        'aria-label': label,
      })}
      asChild="except-style-web"
    >
      {child}
    </TooltipTrigger>
  )
})

export const GlobalTooltipProvider = memo(
  ({ children: providerChildren }: { children: ReactNode }) => {
    'use no memo'

    useEffect(() => {
      if (!isWeb) return
      const controller = new AbortController()
      // capture phase: many controls (pane chrome traffic lights, menu items)
      // stopPropagation in their own click handlers, which strands the open
      // tooltip if this listens on bubble.
      document.addEventListener('click', closeOpenTooltips, {
        capture: true,
        signal: controller.signal,
      })
      window.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape') closeOpenTooltips()
        },
        { capture: true, signal: controller.signal },
      )
      return () => {
        controller.abort()
      }
    }, [])

    const props = useEmitterValue(globalTooltip)
    const overlayOpen = useEmitterValue(overlayOpenEmitter)
    const popoverOpen = useEmitterSelector(
      popoverEmitter,
      (popover) => popover?.state === 'open',
    )

    const {
      label,
      children,
      contentProps,
      disabled: disabledProp,
      ...tooltipProps
    } = props || {}

    const floatingUiOpen = overlayOpen || popoverOpen

    useEffect(() => {
      if (floatingUiOpen) closeOpenTooltips()
    }, [floatingUiOpen])

    const disabled = floatingUiOpen || !label || disabledProp
    const open = !disabled && Boolean(props)

    useHardwareBackHandler(closeOpenTooltips, open)

    return (
      <TamaguiTooltip
        scope="tooltip"
        disableRTL
        offset={20}
        restMs={0}
        open={open}
        allowFlip
        stayInFrame={{
          padding: {
            bottom: 14,
            left: 14,
            right: 14,
            top: 14,
          },
        }}
        {...tooltipProps}
        {...(disabled ? { open: false } : null)}
      >
        {providerChildren}
        {open ? <View display="none" data-overlay-active="tooltip" /> : null}
        <View display="none" data-overlay-host="tooltip" />

        <TooltipContent
          alwaysDisable={PASSIVE_TOOLTIP_CONTENT}
          x="0 enter:0 exit:0"
          y="0 enter:-3px exit:-3px"
          opacity={`${disabled ? 0 : 1} enter:0 exit:0`}
          scale={1}
          borderWidth={0}
          pointerEvents="none"
          py="1"
          px={7}
          maxW={320}
          rounded="2"
          transition={TOOLTIP_TRANSITION}
          boxShadow="0 7px 18px shadow-color"
          bg="background"
          backdropFilter="blur(10px)"
          {...contentProps}
          animatePosition
        >
          <TooltipArrow size={12} boxShadow="0 7px 18px shadow-color" bg="background" />
          {typeof label === 'string' ? (
            <Paragraph
              pointerEvents="none"
              fontFamily="body"
              fontWeight="600"
              size="2"
              color="color"
            >
              {label}
            </Paragraph>
          ) : (
            label
          )}
        </TooltipContent>
      </TamaguiTooltip>
    )
  },
)
