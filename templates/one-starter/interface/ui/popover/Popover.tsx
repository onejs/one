import { createEmitter } from '@o/helpers'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import {
  AnimatePresence,
  isWeb,
  Popover as TamaguiPopover,
  styled,
  View,
  withStaticProperties,
  type GetProps,
  type PopoverProps,
  type Popover as TamaguiPopoverInstance,
} from 'tamagui'
import { animationClamped } from '../animations/animationClamped'
import { useHardwareBackHandler } from '../keyboard/hardwareBack'
import { closeOpenTooltips } from '../tooltip/closeOpenTooltips'

export const popoverEmitter = createEmitter<{
  state: 'open' | 'closed'
  name: string
}>(
  'popover',
  { state: 'closed', name: '' },
  {
    silent: true,
  },
)

// the owner's own label for a popover, published on `popoverEmitter` so app
// chrome can react to a specific one opening
export type PopoverName = string

type TamaguiPopoverArrowProps = Omit<ComponentProps<typeof TamaguiPopover.Arrow>, 'scope'>

export type PopoverContentProps = Omit<
  GetProps<typeof PopoverContentFrame>,
  'children' | 'ref' | 'scope' | 'unstyled'
> & {
  arrow?: boolean | TamaguiPopoverArrowProps
  children?: ReactNode
}

type RootProps = Pick<
  PopoverProps,
  'hoverable' | 'offset' | 'placement' | 'stayInFrame' | 'allowFlip' | 'disableFocus'
>

// viewport rect for a virtual anchor (tamagui's imperative `anchorTo`)
export type PopoverAnchorRect = { x: number; y: number; width: number; height: number }
type TriggerProps = Omit<ComponentProps<typeof TamaguiPopover.Trigger>, 'scope'>

// every hosted popover is controlled by its owner: `open` says what is on
// screen and `onOpenChange` is a request the owner may decline. the host keeps
// no open state of its own.
export type HostedPopoverProps = RootProps & {
  children: ReactNode
  name: PopoverName
  onOpenChange: (open: boolean) => void
  open: boolean
  // when set, the popper positions against this viewport rect instead of a
  // trigger element — for owners whose targets are plain hoverable content
  anchorTo?: PopoverAnchorRect
}

type PopoverDescriptor = {
  id: string
  name: PopoverName
  open: boolean
  onOpenChange: (open: boolean) => void
  rootProps: RootProps
  anchorTo: PopoverAnchorRect | undefined
  content: ReactNode
  contentProps: PopoverContentProps
}

type GlobalPopoverScope = {
  activate: (descriptor: PopoverDescriptor) => void
  update: (descriptor: PopoverDescriptor) => void
  close: (id: string) => void
  closeActive: () => void
}

type PopoverContentSlot = Pick<PopoverDescriptor, 'content' | 'contentProps'>

type LocalPopoverScope = {
  contentRef: { current: PopoverContentSlot }
  activate: () => void
}

const GlobalPopoverScopeContext = createContext<GlobalPopoverScope | null>(null)
const LocalPopoverScopeContext = createContext<LocalPopoverScope | null>(null)

// wrapper-owned appearance. v3 dropped `unstyled`, and Popover.Content ships a
// default skin (space-4 padding, radius-4, a background), so plain undoes it
// explicitly or every bare popover gains a frame it never asked for.
const PopoverContentFrame = styled(TamaguiPopover.Content, {
  z: 200_000,
  contain: 'layout',
  variants: {
    variant: {
      default: {
        transition: animationClamped('quickest'),
        bg: 'background',
        p: 0,
        items: 'flex-start',
        y: 'enter:-4px exit:6px',
        opacity: 'enter:0 exit:0',
        boxShadow: '0 8px 24px shadow-color',
        rounded: '6',
      },
      plain: {
        bg: 'transparent',
        p: 0,
        rounded: 0,
        boxShadow: 'none',
      },
    },
  } as const,
  defaultVariants: {
    variant: 'default',
  },
})

function HostedPopoverContent({ children, arrow = true, ...props }: PopoverContentProps) {
  return (
    <PopoverContentFrame {...props}>
      <>
        <AnimatePresence>
          {arrow ? (
            <TamaguiPopover.Arrow
              bg="background"
              size={14}
              {...(typeof arrow === 'object' ? arrow : null)}
            />
          ) : null}
        </AnimatePresence>
        {children}
      </>
    </PopoverContentFrame>
  )
}

export const GlobalPopoverProvider = memo(function GlobalPopoverProvider({
  children,
  contentProps,
}: {
  children: ReactNode
  // the app's skin for every hosted popover (material class, shadow, radius);
  // a call site's own contentProps layer on top
  contentProps?: PopoverContentProps
}) {
  const [active, setActive] = useState<PopoverDescriptor | null>(null)
  const activeRef = useRef<PopoverDescriptor | null>(null)
  const openRef = useRef(false)
  const hostRef = useRef<TamaguiPopoverInstance>(null)
  const open = active?.open ?? false

  // side effects that fire on a real open/closed edge. visibility itself is
  // read straight off the active descriptor, so there is nothing here to drift.
  const publishOpenState = useCallback((descriptor: PopoverDescriptor) => {
    if (openRef.current === descriptor.open) return
    openRef.current = descriptor.open
    if (descriptor.open) closeOpenTooltips()
    popoverEmitter.emit({
      state: descriptor.open ? 'open' : 'closed',
      name: descriptor.name,
    })
  }, [])

  // hover, focus, outside press and escape all land here. they only ask the
  // owner to move `open`; the host never moves itself. a host that opened on
  // its own would fight an owner that declines the request: the owner's next
  // render re-asserts `open={false}`, the next pointer move re-opens it, and
  // the popover flickers on every mouse move.
  const requestOpenChange = useCallback((nextOpen: boolean) => {
    activeRef.current?.onOpenChange(nextOpen)
  }, [])

  // owners with a virtual anchor position against a viewport rect instead of
  // a trigger element. the rect goes through tamagui's imperative `anchorTo`,
  // which every mounted trigger's popper anchor forwards as the floating
  // reference (the hidden always-mounted trigger below guarantees a carrier).
  const applyAnchor = useCallback((descriptor: PopoverDescriptor) => {
    if (descriptor.open && descriptor.anchorTo) {
      hostRef.current?.anchorTo(descriptor.anchorTo)
    }
  }, [])

  const activate = useCallback(
    (descriptor: PopoverDescriptor) => {
      const previous = activeRef.current
      activeRef.current = descriptor
      setActive(descriptor)
      // taking over from another owner that still thinks it is open would
      // strand it: it is no longer hosted, so nothing would ever close it.
      if (previous && previous.id !== descriptor.id && previous.open) {
        previous.onOpenChange(false)
      }
      applyAnchor(descriptor)
      publishOpenState(descriptor)
    },
    [applyAnchor, publishOpenState],
  )

  const update = useCallback(
    (descriptor: PopoverDescriptor) => {
      if (activeRef.current?.id !== descriptor.id) return
      activeRef.current = descriptor
      setActive(descriptor)
      applyAnchor(descriptor)
      publishOpenState(descriptor)
    },
    [applyAnchor, publishOpenState],
  )

  const close = useCallback((id: string) => {
    const descriptor = activeRef.current
    if (descriptor?.id !== id) return
    activeRef.current = null
    setActive(null)
    if (!openRef.current) return
    openRef.current = false
    popoverEmitter.emit({ state: 'closed', name: descriptor.name })
  }, [])

  const closeActive = useCallback(() => {
    activeRef.current?.onOpenChange(false)
  }, [])

  useHardwareBackHandler(closeActive, open)

  const scope = useMemo(
    () => ({ activate, update, close, closeActive }),
    [activate, close, closeActive, update],
  )

  // focus moving into an iframe never reaches the popover's outside-press
  // handling, so the window blur is the only signal that the pointer left
  useEffect(() => {
    if (!open || !isWeb) return
    const onBlur = () => {
      requestAnimationFrame(() => {
        if (document.activeElement?.tagName === 'IFRAME') requestOpenChange(false)
      })
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [open, requestOpenChange])

  return (
    <GlobalPopoverScopeContext.Provider value={scope}>
      <TamaguiPopover
        ref={hostRef}
        scope="global-popover"
        offset={{ mainAxis: 14 }}
        stayInFrame={{ padding: 20 }}
        allowFlip={{ padding: 25 }}
        {...active?.rootProps}
        open={open}
        onOpenChange={requestOpenChange}
      >
        {children}
        {/* tamagui only routes a virtual anchor rect into the popper through
            a mounted trigger, and element-anchored owners set the reference
            on mouseenter of their own triggers. this hidden inert trigger
            guarantees a virtual-anchor carrier exists even when no real
            trigger is mounted (owners whose targets are plain content). */}
        <TamaguiPopover.Trigger
          scope="global-popover"
          disablePressTrigger
          position="absolute"
          width={0}
          height={0}
          pointerEvents="none"
        >
          <View />
        </TamaguiPopover.Trigger>
        {active ? (
          <HostedPopoverContent {...contentProps} {...active.contentProps}>
            {active.content}
          </HostedPopoverContent>
        ) : null}
        {open ? <View display="none" data-overlay-active="popover" /> : null}
        <View display="none" data-overlay-host="popover" />
      </TamaguiPopover>
    </GlobalPopoverScopeContext.Provider>
  )
})

export function useCloseGlobalPopover() {
  const scope = useContext(GlobalPopoverScopeContext)
  return scope?.closeActive ?? noOp
}

function noOp() {}

function PopoverComponent({
  children,
  name,
  open,
  onOpenChange,
  anchorTo,
  ...rootProps
}: HostedPopoverProps) {
  const globalScope = useContext(GlobalPopoverScopeContext)
  if (!globalScope) throw new Error('Popover must render inside GlobalPopoverProvider')

  const id = useId()
  const descriptorRef = useRef<Omit<PopoverDescriptor, 'content' | 'contentProps'>>({
    id,
    name,
    open,
    onOpenChange,
    rootProps,
    anchorTo,
  })
  descriptorRef.current = { id, name, open, onOpenChange, rootProps, anchorTo }
  // an owner may render its content lazily (the website nav only builds a panel
  // once a nav item is hovered), so a trigger has to be able to claim the host
  // before there is anything to show. an empty slot hosts fine: nothing paints
  // until `open`, and the content arrives on the very next render.
  const contentRef = useRef<PopoverContentSlot>({ content: null, contentProps: {} })

  const descriptor = useCallback(
    (): PopoverDescriptor => ({ ...descriptorRef.current, ...contentRef.current }),
    [],
  )

  const activate = useCallback(() => {
    globalScope.activate(descriptor())
  }, [descriptor, globalScope])

  const localScope = useMemo(() => ({ contentRef, activate }), [activate])

  useLayoutEffect(() => {
    const current = descriptor()
    if (current.open) {
      globalScope.activate(current)
    } else {
      globalScope.update(current)
    }
  })

  useEffect(() => () => globalScope.close(id), [globalScope, id])

  return (
    <LocalPopoverScopeContext.Provider value={localScope}>
      {children}
    </LocalPopoverScopeContext.Provider>
  )
}

const PopoverTrigger = memo(function PopoverTrigger({
  onFocus,
  onMouseEnter,
  onPointerDownCapture,
  ...props
}: TriggerProps) {
  const localScope = useContext(LocalPopoverScopeContext)
  if (!localScope) throw new Error('Popover.Trigger must render inside Popover')

  return (
    <TamaguiPopover.Trigger
      {...props}
      scope="global-popover"
      onFocus={(event) => {
        localScope.activate()
        onFocus?.(event)
      }}
      onMouseEnter={(event) => {
        localScope.activate()
        onMouseEnter?.(event)
      }}
      onPointerDownCapture={(event) => {
        localScope.activate()
        onPointerDownCapture?.(event)
      }}
    />
  )
})

const PopoverContent = memo(function PopoverContent({
  children,
  ...contentProps
}: PopoverContentProps) {
  const localScope = useContext(LocalPopoverScopeContext)
  if (!localScope) throw new Error('Popover.Content must render inside Popover')
  localScope.contentRef.current = { content: children, contentProps }
  return null
})

export const Popover = withStaticProperties(PopoverComponent, {
  Trigger: PopoverTrigger,
  Close: TamaguiPopover.Close,
  Content: PopoverContent,
})
