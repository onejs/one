import {
  createContext,
  memo,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ComponentProps,
  type ReactNode,
} from 'react'
import {
  Dialog as TamaguiDialog,
  isWeb,
  Sheet as TamaguiSheet,
  useDialogContext,
  useMedia,
  useWindowDimensions,
  View,
  YStack,
} from 'tamagui'
import { blurNonEmptyTextField, useEscapeHandler } from '../keyboard/escape'
import { useHardwareBackHandler } from '../keyboard/hardwareBack'
import { useCloseGlobalPopover } from '../popover/Popover'
import { closeOpenTooltips } from '../tooltip/closeOpenTooltips'

export type SheetVariant = 'compact' | 'fit-content' | 'full-height' | 'large' | 'medium'

const sheetVariantProps = {
  compact: { snapPoints: [50], snapPointsMode: 'percent' },
  'fit-content': { snapPointsMode: 'fit' },
  'full-height': { snapPoints: [92], snapPointsMode: 'percent' },
  large: { snapPoints: [86], snapPointsMode: 'percent' },
  medium: { snapPoints: [62], snapPointsMode: 'percent' },
} satisfies Record<
  SheetVariant,
  Pick<ComponentProps<typeof TamaguiSheet>, 'snapPoints' | 'snapPointsMode'>
>

type DialogRegistration = {
  kind: 'dialog'
  id: string
  priority: number
  children: ReactNode
  onOverlayPress?: () => void
  onOpenChange?: (open: boolean) => void
  sheetVariant: SheetVariant
  fullscreen?: boolean
}

export type SheetRegistration = {
  kind: 'sheet'
  id: string
  priority: number
  children: ReactNode
  onOpenChange?: (open: boolean) => void
  sheetVariant: SheetVariant
}

type DialogRegistrationInput = DialogRegistration | SheetRegistration
type RegisteredDialog = DialogRegistrationInput & { sequence: number }

type DialogHostScope = {
  mount: (registration: DialogRegistrationInput) => () => void
  update: (registration: DialogRegistrationInput) => void
  // whether a dialog presents as a sheet at the current width, read here
  // rather than by each dialog: a component's first media read returns the
  // config default, where every max-* query is on, and the host has been
  // subscribed since the app mounted
  dialogPresentsAsSheet: boolean
}

const DialogHostScopeContext = createContext<DialogHostScope | null>(null)

function activeRegistration(registrations: RegisteredDialog[]) {
  return registrations.reduce<RegisteredDialog | null>((best, item) => {
    if (!best) return item
    if (item.priority !== best.priority)
      return item.priority > best.priority ? item : best
    return item.sequence > best.sequence ? item : best
  }, null)
}

// `false` means dialogs never present as sheets, whatever the width. the rnx
// shell window is often phone-shaped, and a bottom sheet there is a full-window
// takeover of the thing the dialog is about.
export type DialogSheetBreakpoint = 'max-md' | 'max-sm' | false

export type DialogSheetContentProps = {
  inset: number
}

export type DialogSheetContent = ComponentType<DialogSheetContentProps>

export function InsetDialogSheetContent({ inset }: DialogSheetContentProps) {
  const context = useDialogContext()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const maxHeight = Math.max(0, windowHeight - inset * 2 - 24)
  // an edge-to-edge sheet rounds its top corners only
  const bottomRadius = inset > 0 ? '9' : 0

  return (
    <YStack
      data-adapted-dialog-sheet=""
      data-overlay-active="sheet"
      data-overlay-surface="dialog"
      role={context.open ? 'dialog' : undefined}
      aria-hidden={context.open ? undefined : true}
      aria-modal={context.open ? true : undefined}
      aria-describedby={context.descriptionId}
      aria-labelledby={context.titleId}
      width={windowWidth - inset * 2}
      self="center"
      maxH={maxHeight}
      mb={inset}
      overflow="hidden"
      // the clip matches the Background below exactly: a square clip here cuts
      // the Background's rounding and reads as a square backing under the
      // content's round corners.
      rounded="9"
      borderBottomLeftRadius={bottomRadius}
      borderBottomRightRadius={bottomRadius}
    >
      <TamaguiSheet.Background
        disableHideBottomOverflow
        bg="background"
        rounded="9"
        borderBottomLeftRadius={bottomRadius}
        borderBottomRightRadius={bottomRadius}
        borderWidth={0.5}
        borderColor="border-color"
        boxShadow="0 20px 60px shadow-color"
      />
      <TamaguiSheet.ScrollView
        maxH={maxHeight}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <YStack pt={18} px={18} pb={inset > 0 ? 18 : '8'}>
          <TamaguiDialog.Adapt.Contents />
        </YStack>
      </TamaguiSheet.ScrollView>
    </YStack>
  )
}

export const GlobalDialogProvider = memo(function GlobalDialogProvider({
  children,
  sheetBreakpoint,
  sheetInset,
  sheetContent: SheetContent = InsetDialogSheetContent,
}: {
  children: ReactNode
  sheetBreakpoint: DialogSheetBreakpoint
  sheetInset: number
  sheetContent?: DialogSheetContent
}) {
  const closePopover = useCloseGlobalPopover()
  const sequenceRef = useRef(0)
  const [registrations, setRegistrations] = useState<RegisteredDialog[]>([])

  const mount = useCallback((registration: DialogRegistrationInput) => {
    const sequence = ++sequenceRef.current
    setRegistrations((current) => [
      ...current.filter((item) => item.id !== registration.id),
      { ...registration, sequence },
    ])
    return () => {
      setRegistrations((current) => current.filter((item) => item.id !== registration.id))
    }
  }, [])

  const update = useCallback((registration: DialogRegistrationInput) => {
    setRegistrations((current) => {
      const index = current.findIndex((item) => item.id === registration.id)
      if (index < 0) return current
      const next = current.slice()
      next[index] = { ...registration, sequence: current[index].sequence }
      return next
    })
  }, [])

  // this read has to happen on every render: Tamagui's media proxy subscribes a
  // component only to the keys that render actually touched, and one that skips
  // the read keeps its pre-hydration snapshot until it reads again. so the
  // adapt below is handed this value rather than the breakpoint key, which it
  // would only read once it was already on.
  const media = useMedia()
  const dialogPresentsAsSheet = sheetBreakpoint ? media[sheetBreakpoint] : false

  const scope = useMemo(
    () => ({ mount, update, dialogPresentsAsSheet }),
    [mount, update, dialogPresentsAsSheet],
  )
  const active = activeRegistration(registrations)
  const activeDialog = active?.kind === 'dialog' ? active : null
  const activeSheet = active?.kind === 'sheet' ? active : null
  const activeId = active?.id
  const onActiveOpenChange = active?.onOpenChange
  // a dialog unregisters as it closes, so what it renders has to outlive its
  // registration: dropping the children in the same commit that `open` goes
  // false leaves the exit animation nothing to run on and the dialog blinks out.
  // keeping the last one mounted costs nothing once closed, because its portal
  // renders null.
  const lastRenderedRef = useRef<RegisteredDialog | null>(null)
  if (active) lastRenderedRef.current = active
  const rendered = active ?? lastRenderedRef.current
  const renderedDialog = rendered?.kind === 'dialog' ? rendered : null
  const renderedSheet = rendered?.kind === 'sheet' ? rendered : null
  const variantProps = sheetVariantProps[rendered?.sheetVariant ?? 'fit-content']

  useLayoutEffect(() => {
    if (!activeId) return
    closeOpenTooltips()
    closePopover()
  }, [activeId, closePopover])

  // `sheetBreakpoint` answers only "how narrow must it be before a DIALOG
  // presents as a sheet". a Sheet registrant already asked for a sheet, so it
  // presents as one at every width. these were one value, and because the sheet
  // registration's children are only mounted inside this Adapt, a Sheet opened
  // above the breakpoint rendered NOTHING: on both marketing sites the header
  // hamburger shows below $md (768) while the adapt breakpoint is max-sm (640),
  // so at 640-767px the button was live and opened an empty overlay, leaving
  // that whole band with no site navigation at all (measured on production
  // 2026-08-19 at 660/700/767px: no `data-overlay-active`, no close control).
  // the landing page's `$md`-gated Details sidebar had the same dead band.
  //
  // and with nothing registered there is nothing to present at all, so the
  // adapt stays off. width alone used to turn it on, and the target that would
  // consume it is Tamagui's Sheet, which renders null until `useDidFinishSSR`
  // resolves: on the first client render every max-* query still reads true
  // from the pre-hydration media snapshot, so a desktop window activated the
  // adapt with no sheet mounted yet and Tamagui reported an adapt nobody
  // consumed (a dev console.error the e2e harness fails on).
  const sheetAdaptWhen =
    !rendered || renderedDialog?.fullscreen
      ? false
      : renderedSheet
        ? true
        : dialogPresentsAsSheet

  // Tamagui's Sheet implements no escape key of its own, so wherever the
  // overlay presents as a sheet it has no keyboard way out unless we supply
  // one. above the breakpoint a DIALOG handles the key itself, including the
  // two-step blur-then-close its content installs through onEscapeKeyDown, so
  // this deliberately stays out of that path rather than closing over it — but
  // a sheet is never in that path at any width.
  const closeActive = useCallback(() => {
    if (blurNonEmptyTextField()) return
    onActiveOpenChange?.(false)
  }, [onActiveOpenChange])
  useEscapeHandler(closeActive, Boolean(active && sheetAdaptWhen))
  // android back dismisses the overlay in either presentation: the native
  // dialog and sheet render inline with no system back handling of their own,
  // so without this the press would pop the route underneath instead.
  useHardwareBackHandler(closeActive, Boolean(active))

  return (
    <DialogHostScopeContext.Provider value={scope}>
      {children}
      <TamaguiDialog
        modal
        open={Boolean(active)}
        onOpenChange={(open) => onActiveOpenChange?.(open)}
      >
        <TamaguiDialog.Adapt when={sheetAdaptWhen}>
          <TamaguiSheet
            {...variantProps}
            modal
            dismissOnSnapToBottom
            disableHideWhenClosed={!isWeb}
            moveOnKeyboardChange
            unmountChildrenWhenHidden
            transition="quickLessBouncy"
            zIndex={250_000}
          >
            {renderedSheet?.children}
            {renderedDialog ? (
              <TamaguiSheet.Overlay
                bg="shadow-6"
                backdropFilter="blur(5px)"
                transition="quickest"
                opacity="1 enter:0 exit:0"
                onPress={() => {
                  if (renderedDialog.onOverlayPress) renderedDialog.onOverlayPress()
                  else renderedDialog.onOpenChange?.(false)
                }}
              />
            ) : null}
            {renderedDialog ? (
              <TamaguiSheet.Container>
                <SheetContent inset={sheetInset} />
              </TamaguiSheet.Container>
            ) : null}
            {activeSheet ? <View display="none" data-overlay-active="sheet" /> : null}
          </TamaguiSheet>
        </TamaguiDialog.Adapt>

        {renderedDialog?.children}
      </TamaguiDialog>
      {activeDialog ? <View display="none" data-overlay-active="dialog" /> : null}
      <View display="none" data-overlay-host="dialog" />
      <View display="none" data-overlay-host="sheet" />
    </DialogHostScopeContext.Provider>
  )
})

// the width below which the host presents dialogs as sheets, so an overlay
// that renders in place (a route sheet, whose screen must stay under its data
// providers) makes the same call the host does. the caller reads the media
// key itself: tamagui subscribes a component only to keys it reads.
export function useDialogPresentsAsSheet(): boolean {
  const scope = useContext(DialogHostScopeContext)
  return scope?.dialogPresentsAsSheet ?? false
}

export function useDialogHostRegistration(
  registration: Omit<DialogRegistration, 'id'> | Omit<SheetRegistration, 'id'>,
  open: boolean | undefined,
  owner: string,
) {
  const scope = useContext(DialogHostScopeContext)
  if (!scope) throw new Error(`${owner} must render inside GlobalOverlayProvider`)

  const id = useId()
  const currentRegistration = useMemo(() => ({ ...registration, id }), [id, registration])
  const registrationRef = useRef(currentRegistration)
  registrationRef.current = currentRegistration

  useLayoutEffect(() => {
    if (!open) return
    return scope.mount(registrationRef.current)
  }, [id, open, scope])

  useLayoutEffect(() => {
    if (open) scope.update(currentRegistration)
  }, [currentRegistration, open, scope])
}

export type HostedDialogProps = {
  children: ReactNode
  layer?: 'default' | 'elevated'
  onOverlayPress?: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  sheetVariant?: SheetVariant
  fullscreen?: boolean
}

export const HostedDialog = memo(function HostedDialog({
  children,
  layer = 'default',
  onOverlayPress,
  open,
  onOpenChange,
  sheetVariant = 'fit-content',
  fullscreen,
}: HostedDialogProps) {
  const registration = useMemo(
    () => ({
      kind: 'dialog' as const,
      priority: layer === 'elevated' ? 100 : 0,
      children,
      onOverlayPress,
      onOpenChange,
      sheetVariant,
      fullscreen,
    }),
    [children, layer, onOverlayPress, onOpenChange, sheetVariant, fullscreen],
  )
  useDialogHostRegistration(registration, open, 'HostedDialog')
  return null
})
