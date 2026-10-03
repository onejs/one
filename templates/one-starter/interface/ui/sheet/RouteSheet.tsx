import {
  Dialog as TamaguiDialog,
  Sheet as TamaguiSheet,
  isWeb,
  useAdaptIsActive,
  useDialogContext,
} from 'tamagui'
import { DialogContent, DialogOverlay } from '../dialog/Dialog'
import { useDialogPresentsAsSheet } from '../dialog/DialogHost'
import { blurNonEmptyTextField } from '../keyboard/escape'
import type { ReactNode } from 'react'

// the web presentation for a route whose Stack.Screen asks for a sheet. One's
// <Presentations web={{ sheet: RouteSheet }}> hands it the screen and the same
// options the native stack reads, so a layout declares its sheet once.
//
// it renders in place, under the navigator, rather than through the dialog
// host: the host mounts what it shows at the app root, and a route screen owns
// data hooks that need the providers above its navigator. tamagui's modal
// Dialog portals through react-dom, which keeps that context.
//
// it presents the way the host presents a Dialog: one Dialog that adapts to a
// bottom sheet below the host's sheet breakpoint, driven by the native
// detents, and a centred card above it. the sheet has to be the Dialog's adapt
// target: the app sits inside the global popover, whose idle adapt context
// reaches a bare Sheet and keeps it hidden.
export type RouteSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: { options: Record<string, unknown> }
  children: ReactNode
}

// the screen brings its own header and padding, as it does on native, so the
// card carries none; under the adapt the sheet container is the frame instead
function RouteSheetCard({ title, children }: { title?: string; children: ReactNode }) {
  const dialogContext = useDialogContext()
  const isAdapted = useAdaptIsActive(dialogContext.adaptScope)
  return (
    // under the adapt the portal frame stays mounted, fixed over the viewport
    // and empty, so it must not catch the taps meant for the sheet below it.
    // the frame is the <dialog> the browser focuses when the screen has no
    // field of its own to take it, and the agent ring it draws then hugs the
    // whole viewport
    <TamaguiDialog.Portal
      z={500_000}
      outlineStyle="none"
      pointerEvents={isAdapted ? 'none' : undefined}
    >
      <TamaguiDialog.Overlay asChild>
        <DialogOverlay
          z={0}
          onPress={(event) => {
            dialogContext.onOpenChange(false)
            event.stopPropagation()
            event.preventDefault()
          }}
        />
      </TamaguiDialog.Overlay>
      <TamaguiDialog.Content
        asChild
        aria-label={title}
        onEscapeKeyDown={(event) => {
          if (isWeb && blurNonEmptyTextField(event.event?.target)) event.cancel()
        }}
      >
        <DialogContent
          passThrough={isAdapted}
          z={1}
          maxW={540}
          p={0}
          gap={0}
          overflow="hidden"
          data-overlay-surface="dialog"
          adapted={isAdapted}
        >
          {children}
        </DialogContent>
      </TamaguiDialog.Content>
    </TamaguiDialog.Portal>
  )
}

export function RouteSheet({ open, onOpenChange, screen, children }: RouteSheetProps) {
  // the presentation opens in an effect a render after it mounts. gating on
  // `open` keeps the adapt from activating for a closed dialog: once active
  // with nothing open it waits for a close transition that never comes and
  // the card path stays dark at every width
  const hostPresentsAsSheet = useDialogPresentsAsSheet()
  const presentsAsSheet = open && hostPresentsAsSheet

  const options = screen.options
  const title = typeof options.title === 'string' ? options.title : undefined
  // a sheet that leaves a detent undimmed keeps the screen behind it live;
  // on web that is the whole sheet, since there is no detent to cross
  const undimmed = typeof options.sheetLargestUndimmedDetentIndex === 'number'

  const cornerRadius =
    typeof options.sheetCornerRadius === 'number' ? options.sheetCornerRadius : 28

  return (
    <TamaguiDialog modal open={open} onOpenChange={onOpenChange}>
      <TamaguiDialog.Adapt when={presentsAsSheet}>
        <TamaguiSheet
          modal
          dismissOnSnapToBottom
          moveOnKeyboardChange
          unmountChildrenWhenHidden
          transition="quickLessBouncy"
          zIndex={250_000}
          // the web sheet sizes to its content; native detents are a screen
          // geometry the web has no need to copy
          snapPointsMode="fit"
        >
          {undimmed ? null : (
            <TamaguiSheet.Overlay
              bg="shadow-6"
              backdropFilter="blur(5px)"
              transition="quickest"
              opacity="1 enter:0 exit:0"
            />
          )}
          <TamaguiSheet.Container
            width="100%"
            maxW={540}
            maxH="92%"
            self="center"
            borderTopLeftRadius={cornerRadius}
            borderTopRightRadius={cornerRadius}
            overflow="hidden"
            boxShadow="0 -8px 32px shadow-2"
            aria-label={title}
          >
            <TamaguiSheet.Background bg="background" />
            <TamaguiDialog.Adapt.Contents />
          </TamaguiSheet.Container>
        </TamaguiSheet>
      </TamaguiDialog.Adapt>
      <RouteSheetCard title={title}>{children}</RouteSheetCard>
    </TamaguiDialog>
  )
}
