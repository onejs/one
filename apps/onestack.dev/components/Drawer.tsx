import { useAnimatedNumber, useAnimatedNumberStyle } from '@tamagui/animations-css/extras'
import { FocusScope } from '@tamagui/focus-scope'
import { Portal } from '@tamagui/portal'
import type { Dispatch, SetStateAction } from 'react'
import React, { forwardRef, useRef, useState } from 'react'
import { Modal, PanResponder, Platform } from 'react-native'
import type { Animated } from 'react-native'
import type { PortalProps, ViewProps, TamaguiElement } from 'tamagui'
import {
  View,
  YStack,
  createStyledContext,
  styled,
  useControllableState,
  createStyledHOC,
  withStaticProperties,
} from 'tamagui'
import { AnimatePresence } from '@tamagui/animate-presence'

export const DrawerContext = createStyledContext<{
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}>({
  open: false,
  setOpen: () => {},
})

const SwipeDismissableComponent = React.forwardRef<
  TamaguiElement,
  ViewProps & { onDismiss: () => void; children: any; dismissAfter?: number }
>(({ onDismiss, children, dismissAfter = 80, ...rest }, ref) => {
  const pan = useAnimatedNumber(0)
  const [dragStarted, setDragStarted] = useState(false)
  const dismissAfterRef = useRef(dismissAfter)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gestureState) => {
        const { dx } = gestureState
        if (dx < 0) {
          setDragStarted(true)
          pan.setValue(dx, {
            type: 'direct',
          })
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        setDragStarted(false)
        if (gestureState.dx < -dismissAfterRef.current) {
          if (onDismiss) {
            onDismiss()
          }
        } else {
          pan.setValue(0, {
            type: 'spring',
            overshootClamping: true,
          })
        }
      },
    })
  ).current

  const panStyle = useAnimatedNumberStyle(pan, (val) => {
    'worklet'
    return {
      transform: [{ translateX: val }],
    }
  })

  return (
    <YStack
      ref={ref}
      {...(panResponder.panHandlers as any)}
      {...rest}
      height="100%"
      pointerEvents={dragStarted ? 'none' : rest.pointerEvents}
      style={[panStyle, rest.style]}
    >
      {children}
    </YStack>
  )
})

const DrawerFrame = styled(YStack, {
  variants: {
    unstyled: {
      false: {
        paddingVertical: '2',
        width: 210,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        backgroundColor: 'background',
        x: 0,
        gap: '4',
      },
    },
  } as const,

  defaultVariants: {
    unstyled: false,
  },
})

type DrawerProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * When true, uses a portal to render at the very top of the root TamaguiProvider.
   */
  portalToRoot?: boolean
}

const Overlay = styled(YStack, {
  displayName: 'DrawerOverlay',
  context: DrawerContext,
  opacity: 'enter:0 exit:0',
  variants: {
    unstyled: {
      false: {
        inset: 0,
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100_000 - 1,
      },
    },
  } as const,
  defaultVariants: {
    unstyled: process.env.TAMAGUI_HEADLESS === '1',
  },
})

const DrawerOverlay = createStyledHOC(Overlay, (props, ref) => {
  const { setOpen } = DrawerContext.useStyledContext()
  return <Overlay ref={ref} onPress={() => setOpen(false)} {...props} />
})

const DrawerSwipeable = forwardRef<
  TamaguiElement,
  Omit<React.ComponentProps<typeof SwipeDismissableComponent>, 'onDismiss'>
>((props, ref) => {
  const { setOpen, open: _open } = DrawerContext.useStyledContext()
  return (
    <SwipeDismissableComponent
      onDismiss={() => setOpen(false)}
      zIndex={1000_000_000}
      position="absolute"
      {...props}
      ref={ref}
    />
  )
})

const DrawerContent = createStyledHOC(DrawerFrame, (props, ref) => {
  const { children, ...rest } = props

  return (
    <FocusScope trapped enabled={true} loop>
      <DrawerFrame
        ref={ref}
        render="nav"
        theme={rest.unstyled ? undefined : 'inverse'}
        transition="medium"
        x={`enter:${-(rest.width || rest.w || 210)}px exit:${-(rest.width || rest.w || 210)}px`}
        {...rest}
      >
        {children}
      </DrawerFrame>
    </FocusScope>
  )
})

const DrawerImpl = ({
  open = false,
  onOpenChange,
  children,
  portalToRoot,
  ...rest
}: DrawerProps & { children?: React.ReactNode }) => {
  const [_open, setOpen] = useControllableState({
    prop: open,
    defaultProp: false,
    onChange: onOpenChange,
  })
  // biome-ignore lint/complexity/noUselessFragments: necessary for AnimatedPresence
  const content = open && <React.Fragment key="content">{children}</React.Fragment>
  return (
    <DrawerContext.Provider open={_open} setOpen={setOpen}>
      <AnimatePresence>{open && content}</AnimatePresence>
    </DrawerContext.Provider>
  )
}

const DrawerPortal = (props: PortalProps) => {
  return Platform.select({
    web: <Portal zIndex={1000000000} {...props} />,
    native: (
      <Modal animationType="none" transparent={true}>
        {props.children}
      </Modal>
    ),
  })
}

export const Drawer = withStaticProperties(DrawerImpl, {
  Content: DrawerContent,
  Overlay: DrawerOverlay,
  Swipeable: DrawerSwipeable,
  Portal: DrawerPortal,
})
