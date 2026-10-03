import { memo, useMemo, type ReactNode } from 'react'
import { Sheet as TamaguiSheet, withStaticProperties } from 'tamagui'
import { useDialogHostRegistration, type SheetVariant } from '../dialog/DialogHost'

export type SheetProps = {
  children: ReactNode
  onOpenChange?: (open: boolean) => void
  open: boolean
  sheetVariant?: SheetVariant
}

const SheetRegistration = memo(function SheetRegistration({
  children,
  open,
  onOpenChange,
  sheetVariant = 'fit-content',
}: SheetProps) {
  const registration = useMemo(
    () => ({
      kind: 'sheet' as const,
      priority: 0,
      children,
      onOpenChange,
      sheetVariant,
    }),
    [children, onOpenChange, sheetVariant],
  )
  useDialogHostRegistration(registration, open, 'Sheet')
  return null
})

// no Handle part. a drag handle is a phone-app affordance, and on a web page it
// reads as a stray grey bar above the sheet rather than as part of it. drag to
// dismiss still works on the frame itself, alongside the overlay and the sheet's
// own close control.
export const Sheet = withStaticProperties(SheetRegistration, {
  Container: TamaguiSheet.Container,
  Background: TamaguiSheet.Background,
  Overlay: TamaguiSheet.Overlay,
  ScrollView: TamaguiSheet.ScrollView,
})
