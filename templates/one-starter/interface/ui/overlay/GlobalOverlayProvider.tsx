import { memo, type ReactNode } from 'react'
import { DialogConfirm } from '../dialog/confirm'
import {
  GlobalDialogProvider,
  type DialogSheetBreakpoint,
  type DialogSheetContent,
} from '../dialog/DialogHost'
import { GlobalPopoverProvider, type PopoverContentProps } from '../popover/Popover'
import { GlobalTooltipProvider } from '../tooltip/Tooltip'

export const GlobalOverlayProvider = memo(function GlobalOverlayProvider({
  children,
  dialogSheetBreakpoint = 'max-sm',
  dialogSheetInset = true,
  dialogSheetContent,
  popoverContentProps,
}: {
  children: ReactNode
  dialogSheetBreakpoint?: DialogSheetBreakpoint
  // how far the phone sheet floats from the window edge. `true` is the 12px
  // card inset, `false` is an edge-to-edge bottom sheet, a number is px.
  dialogSheetInset?: boolean | number
  // The host owns Sheet.Overlay and Sheet.Container as its direct children.
  // App material belongs inside this content component.
  dialogSheetContent?: DialogSheetContent
  popoverContentProps?: PopoverContentProps
}) {
  return (
    <GlobalTooltipProvider>
      <GlobalPopoverProvider contentProps={popoverContentProps}>
        <GlobalDialogProvider
          sheetBreakpoint={dialogSheetBreakpoint}
          sheetContent={dialogSheetContent}
          sheetInset={
            dialogSheetInset === true
              ? 12
              : dialogSheetInset === false
                ? 0
                : dialogSheetInset
          }
        >
          {children}
          <DialogConfirm />
        </GlobalDialogProvider>
      </GlobalPopoverProvider>
    </GlobalTooltipProvider>
  )
})
