import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import {
  Dialog as TamaguiDialog,
  ScrollView,
  Separator,
  Theme,
  VisuallyHidden,
  XStack,
  YStack,
  isWeb,
  styled,
  useAdaptIsActive,
  useDialogContext,
  withStaticProperties,
  type TamaguiElement,
  type YStackProps,
} from 'tamagui'
import { View } from 'tamagui'
import { Button, type ButtonProps } from '../buttons/Button'
import { XIcon } from '../icons/XIcon'
import { blurNonEmptyTextField } from '../keyboard/escape'
import { HostedDialog } from './DialogHost'

const OVERLAY_DISMISS_GUARD_MS = 350

type DialogSize =
  | 'compact'
  | 'default'
  | 'medium'
  | 'large'
  | 'wide'
  | 'list'
  | 'settings'
  | 'fill'

export type DialogProps = Pick<
  ComponentProps<typeof HostedDialog>,
  'open' | 'onOpenChange'
> & {
  size?: DialogSize
  height?: ComponentProps<typeof YStack>['height']
  minH?: number
  minW?: number
  contentInset?: 'none'
  contentTestId?: string
  autoFocusFirstField?: boolean
  elevated?: boolean
  fullscreen?: boolean
  // the app injects its glass close here; the default stays a plain button so
  // this public package never depends on the private interface kit.
  closeElement?: ReactNode
  children: ReactNode
}

// the app's heading face, left aligned like every other header in the app, so
// a sheet or dialog reads as a page of the product rather than a system alert
const DialogTitle = styled(TamaguiDialog.Title, {
  fontFamily: 'heading',
  size: '6',
  fontWeight: '600',
  // clears the inset close (a 44px hit box at 12px from the edge)
  pr: '14',
  mb: '2',
  color: 'color',
})

const DialogDescription = styled(TamaguiDialog.Description, {
  fontFamily: 'body',
  size: '4',
  color: 'placeholder-color',
  mb: 7,
})

// title and description in one block. `hidden` keeps them for assistive
// technology when the body carries its own heading.
function DialogHeader({
  title,
  description,
  hidden,
}: {
  title?: string
  description?: string
  hidden?: boolean
}) {
  const content = (
    <YStack pointerEvents="box-none" gap="0-5" shrink={0}>
      <DialogTitle cursor="default" select="none">
        {title}
      </DialogTitle>
      {!!description && <DialogDescription>{description}</DialogDescription>}
    </YStack>
  )
  return hidden ? <VisuallyHidden>{content}</VisuallyHidden> : content
}

function DialogBody({ children, ...props }: YStackProps) {
  const dialogContext = useDialogContext()
  const isAdapted = useAdaptIsActive(dialogContext.adaptScope)
  const contents = (
    <YStack gap={7} px="0-5" pb={8}>
      {children}
    </YStack>
  )
  if (isAdapted) {
    return <YStack {...props}>{contents}</YStack>
  }
  // no overflow clip: one here cuts the left and right edges of field focus
  // rings, which read as clipping rather than containment.
  return (
    <YStack grow={1} shrink={1} minH={0} {...props}>
      <ScrollView
        m="-0-5"
        grow={1}
        shrink={1}
        minH={0}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {contents}
      </ScrollView>
    </YStack>
  )
}

function DialogFooter({ children, ...props }: YStackProps) {
  return (
    <YStack gap={12} shrink={0} {...props}>
      <Separator opacity={0.5} />
      <XStack justify="flex-end" items="center" gap={7} flexWrap="wrap">
        {children}
      </XStack>
    </YStack>
  )
}

// the same four tone names the app's Dialog uses. this one renders the kit's
// Button, which has no `action` prop, so the theme is resolved here to the same
// brand, destroy is red.
export type DialogActionProps = ButtonProps & {
  tone?: 'default' | 'create' | 'confirm' | 'destroy'
}
function DialogAction({ tone = 'default', ...props }: DialogActionProps) {
  return (
    <Button
      theme={
        tone === 'destroy'
          ? 'red'
          : tone === 'confirm' || tone === 'create'
            ? 'brand'
            : null
      }
      {...props}
    />
  )
}

// the animated frames own their styles so the driver receives exit targets
// before the dialog behavior converts styles to classes. exported so the route
// sheet presents the same card without going through the host.
export const DialogOverlay = styled(YStack, {
  position: 'absolute',
  inset: 0,
  transition: 'medium',
  bg: 'shadow-3',
  backdropFilter: 'blur(3px)',
  opacity: 'enter:0 exit:0',
})

export const DialogContent = styled(YStack, {
  group: 'dialog',
  container: 'dialog',
  transition: 'medium',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  p: 16,
  bg: 'background',
  borderWidth: 0.5,
  borderColor: 'border-color',
  rounded: '4xl',
  boxShadow: '0 20px 60px shadow-color',
  w: '100%',
  maxH: '90%',
  scale: 'enter:0.985',
  y: 'enter:-5px exit:5px',
  opacity: 'enter:0 exit:0',
  outlineWidth: 'focus-visible:2px',
  outlineColor: 'focus-visible:outline-color/30',
  outlineStyle: 'focus-visible:solid',

  variants: {
    size: {
      compact: { maxW: 360 },
      default: { maxW: 430 },
      medium: { maxW: 520 },
      large: { maxW: 600 },
      wide: { maxW: 860 },
      list: { maxW: 720 },
      settings: { maxW: 920 },
      fill: { maxW: '90%' },
    },

    // under the adapt the sheet's Background is the surface, so the content
    // paints nothing of its own. passThrough strips the frame on native only
    // (it is absent from Tamagui's web bundles), so the web leg needs the
    // neutral frame or the card double-draws under the sheet: a square
    // backing behind round corners. RouteSheet's adapted card shares it.
    adapted: {
      true: { bg: 'transparent', borderWidth: 0, boxShadow: 'none' },
    },

    fullscreen: {
      true: {
        bg: 'transparent',
        w: '100%',
        h: '100%',
        maxW: '100%',
        maxH: '100%',
        p: 0,
        gap: 0,
        borderWidth: 0,
        rounded: 0,
        boxShadow: 'none',
        scale: 1,
        y: 0,
      },
    },
  } as const,
})

function DialogPresentation({
  size = 'default',
  height,
  minH,
  minW,
  contentInset,
  contentTestId,
  autoFocusFirstField = true,
  fullscreen = false,
  closeElement,
  onOpenChange,
  children,
}: DialogProps) {
  const dialogContext = useDialogContext()
  const isAdapted = useAdaptIsActive(dialogContext.adaptScope)
  const contentRef = useRef<TamaguiElement>(null)
  // the working-surface sizes take most of the window's height as a card. a
  // phone sheet fits its content, and theirs is flex columns with no height of
  // their own, so under the adapt they state the height the sheet fits.
  const fillHeight =
    fullscreen ||
    size === 'wide' ||
    size === 'list' ||
    size === 'settings' ||
    size === 'fill' ||
    !!height
  return (
    // under the adapt the portal frame stays mounted, fixed over the viewport
    // and empty, so it must not catch the taps meant for the sheet below it
    // (the sheet draws its own overlay in the host). without this every
    // adapted dialog renders its sheet and swallows every tap on it.
    <TamaguiDialog.Portal
      z={500_000}
      p={fullscreen ? 0 : undefined}
      pointerEvents={isAdapted ? 'none' : undefined}
      // the portal frame is structural: when tamagui's autofocus finds no
      // tabbable inside it (the adapted sheet content lives in the host),
      // focus falls back to this full-viewport frame, and the browser's
      // default focus-visible ring draws a viewport outline. the card draws
      // its own ring and the sheet needs none, so the frame never outlines.
      outlineStyle="none"
    >
      <TamaguiDialog.Overlay asChild>
        <DialogOverlay
          z={0}
          {...(fullscreen ? { bg: '#000000e6', backdropFilter: 'none' } : {})}
          onPress={(event) => {
            onOpenChange?.(false)
            event.stopPropagation()
            event.preventDefault()
          }}
        />
      </TamaguiDialog.Overlay>
      <TamaguiDialog.Content
        asChild
        ref={contentRef}
        onOpenAutoFocus={
          autoFocusFirstField
            ? undefined
            : (event) => {
                event.cancel()
                contentRef.current?.focus()
              }
        }
        onEscapeKeyDown={(event) => {
          if (isWeb && blurNonEmptyTextField(event.event?.target)) event.cancel()
        }}
      >
        <DialogContent
          passThrough={isAdapted}
          z={1}
          size={size}
          // an explicit prop outranks a variant, so fullscreen leaves its
          // height and padding to the fullscreen variant
          h={fullscreen ? undefined : (height ?? (fillHeight ? '86%' : undefined))}
          minH={minH}
          minW={minW}
          p={fullscreen ? undefined : contentInset === 'none' ? 0 : 16}
          data-overlay-surface="dialog"
          data-testid={contentTestId}
          adapted={isAdapted}
          fullscreen={fullscreen}
        >
          {/* only an edge-to-edge dialog needs its content clipped to the card's
              corners. clipping a padded one cuts the corners off whatever sits
              at the bottom of the column, which is the footer's actions. */}
          <View
            flex={fillHeight && !isAdapted ? 1 : undefined}
            height={fillHeight && isAdapted ? '80dvh' : undefined}
            {...(contentInset === 'none' && !fullscreen
              ? { rounded: '4xl' as const, overflow: 'hidden' as const }
              : null)}
          >
            <Theme name={fullscreen ? 'dark' : undefined} forceClassName>
              {children}
            </Theme>
          </View>
          {fullscreen ? null : (
            // tamagui's close returns null under the adapt unless told
            // otherwise; the phone sheet keeps the same bare X as the card.
            <TamaguiDialog.Close asChild displayWhenAdapted>
              {closeElement ?? (
                <YStack
                  position="absolute"
                  t={12}
                  r={12}
                  w={44}
                  h={44}
                  // the material 48dp touch target without changing the
                  // 44pt look: hitSlop is invisible and ignored on web.
                  hitSlop={2}
                  items="center"
                  justify="center"
                  cursor="pointer"
                  scale="press:0.92"
                  transition="quick"
                  aria-label="Close dialog"
                >
                  <XIcon size={20} color="color-11" />
                </YStack>
              )}
            </TamaguiDialog.Close>
          )}
        </DialogContent>
      </TamaguiDialog.Content>
    </TamaguiDialog.Portal>
  )
}

function DialogFrame(props: DialogProps) {
  const { open, onOpenChange, elevated } = props
  const overlayDismissAfter = useRef(0)
  useEffect(() => {
    // consume a rapid second trigger tap while the modal is opening
    if (open) overlayDismissAfter.current = Date.now() + OVERLAY_DISMISS_GUARD_MS
  }, [open])
  const dismissFromOverlay = () => {
    if (Date.now() < overlayDismissAfter.current) return
    onOpenChange?.(false)
  }
  return (
    <HostedDialog
      open={open}
      onOpenChange={onOpenChange}
      onOverlayPress={dismissFromOverlay}
      layer={elevated ? 'elevated' : 'default'}
      fullscreen={props.fullscreen}
    >
      <DialogPresentation {...props} onOpenChange={dismissFromOverlay} />
    </HostedDialog>
  )
}

export const Dialog = withStaticProperties(DialogFrame, {
  Header: DialogHeader,
  Title: DialogTitle,
  Description: DialogDescription,
  Body: DialogBody,
  Footer: DialogFooter,
  Action: DialogAction,
  Close: TamaguiDialog.Close,
})
