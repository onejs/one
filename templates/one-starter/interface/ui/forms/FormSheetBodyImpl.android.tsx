import { useRouter, useSafeAreaInsets } from 'one'
// the insets come from the provider One mounts at its root: this package
// resolves to One's copy unless the app declares its own.
import { AdaptPortalContents, Dialog as TamaguiDialog, Sheet, YStack } from 'tamagui'
import type { FormSheetBodyProps, FormSheetFrameProps } from './formContract'

// the android leg. react-native-screens' formSheet is an ios presentation: on
// android it draws the system (Material) sheet, which is not the sheet the
// product declares. the route presents over the presenting screen as a
// transparent modal with no system animation (see
// sheet/routeSheetOptionsImpl.android.ts) and this frame draws the Tamagui
// sheet in it, with the look the web route sheet has: the same overlay, the
// same container, the same 50% and 92% detents as snap points, drag to dismiss.
//
// tamagui's snap points run largest first, so the 92 detent is the first entry
// and `defaultPosition` opens the sheet at the 50 one, the detent the ios sheet
// opens at by default. `adjustPaddingForOffscreenContent` keeps a grow body
// inside the visible part of the frame instead of the full 92% box, so a
// footer action sits at the bottom of the half detent the way it does in the
// ios sheet.
//
// the sheet has to be the Dialog's adapt target rather than a bare Sheet: the
// app sits inside the global popover, whose idle adapt context reaches a bare
// Sheet and keeps it hidden. this is the same structure the dialog host
// presents dialogs with, and the same reason RouteSheet.tsx gives for it.
export function FormSheetFrame({ children, paddingBottom }: FormSheetFrameProps) {
  const router = useRouter()
  return (
    <TamaguiDialog
      modal
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) router.back()
      }}
    >
      <TamaguiDialog.Adapt when>
        <Sheet
          modal
          dismissOnSnapToBottom
          moveOnKeyboardChange
          snapPoints={[92, 50]}
          snapPointsMode="percent"
          defaultPosition={1}
          transition="quickLessBouncy"
          zIndex={250_000}
        >
          <Sheet.Overlay
            bg="shadow-6"
            backdropFilter="blur(5px)"
            transition="quickest"
            opacity="1 enter:0 exit:0"
          />
          <Sheet.Container
            width="100%"
            maxW={640}
            self="center"
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
            pb={paddingBottom}
            overflow="hidden"
            boxShadow="0 -8px 32px shadow-2"
            adjustPaddingForOffscreenContent
          >
            <Sheet.Background bg="background" />
            {/* the material 3 drag handle: 32x4, centred, fixed above the
                scrolling body. the web sheet deliberately has none (Sheet.tsx),
                and on ios the system draws the grabber. */}
            <YStack items="center" pt={8}>
              <YStack w={32} h={4} rounded="full" bg="color-10" opacity={0.4} />
            </YStack>
            <TamaguiDialog.Adapt.Contents />
          </Sheet.Container>
        </Sheet>
      </TamaguiDialog.Adapt>
      <AdaptPortalContents>{children}</AdaptPortalContents>
    </TamaguiDialog>
  )
}

// the frame with a scrolling column inside it, for a sheet whose content is a
// stack of blocks above and around a `<Form presentation="sheet">`. the scroll
// view is the sheet's own, so the drag handoff between the body and the sheet
// is the one tamagui coordinates; the padding the web leg puts on the content
// container goes on a column inside it instead, because the sheet's scroll view
// owns its content container.
export function FormSheetBody({ children }: FormSheetBodyProps) {
  const insets = useSafeAreaInsets()
  return (
    <FormSheetFrame>
      <Sheet.ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <YStack pt={8} pb={insets.bottom + 12} px={16} gap={16}>
          {children}
        </YStack>
      </Sheet.ScrollView>
    </FormSheetFrame>
  )
}
