import { FormSheetFrame } from '~/interface/ui/forms/FormSheetBody'
import { useRouter } from 'one'
import { ScrollView, SizableText, XStack, YStack } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { Pressable } from '~/interface/buttons/Pressable'
import { Icons } from '~/interface/icons'
import type { ReactNode } from 'react'

// a route presented as a sheet. the web leg: the flat large title with its
// close, the scrolling body, and the one primary action pinned below it. ios
// renders the system form sheet (SheetScreen.ios.tsx) and android an M3
// full-screen dialog (SheetScreen.android.tsx). a disabled action names its
// reason at the control through disabledReason, so an empty required field
// reads as its requirement beside the action.
export function SheetScreen({
  title,
  testID,
  action,
  children,
}: {
  title: string
  testID?: string
  action: {
    label: string
    onPress: () => void
    disabled?: boolean
    disabledReason?: string
    testID?: string
  }
  children: ReactNode
}) {
  const router = useRouter()
  const close = () => router.back()
  return (
    <FormSheetFrame>
      <YStack grow={1} shrink={1} minH={0} px="4" pt="4" pb={18} gap="3" testID={testID}>
        <XStack items="center" justify="space-between" gap="3">
          <SizableText fontFamily="heading" size="8" fontWeight="600" color="color">
            {title}
          </SizableText>
          <Pressable
            aria-label="Close"
            onPress={close}
            w={44}
            h={44}
            shrink={0}
            items="center"
            justify="center"
          >
            <Icons.Close size={20} color="color-11" />
          </Pressable>
        </XStack>
        <ScrollView
          grow={0}
          shrink={1}
          minH={0}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        >
          {children}
        </ScrollView>
        {action.disabled && action.disabledReason ? (
          <SizableText
            size="2"
            color="color-11"
            text="center"
            testID={action.testID ? `${action.testID}-reason` : 'sheet-action-reason'}
          >
            {action.disabledReason}
          </SizableText>
        ) : null}
        <Button
          accent
          size="lg"
          w="100%"
          disabled={action.disabled}
          onPress={action.onPress}
          testID={action.testID}
        >
          {action.label}
        </Button>
      </YStack>
    </FormSheetFrame>
  )
}
