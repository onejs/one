import { FormSheetFrame } from '~/interface/ui/forms/FormSheetBody'
import { Stack, useRouter, useSafeAreaInsets } from 'one'
import { SizableText, useTheme, YStack } from 'tamagui'
import type { ReactNode } from 'react'

// a route presented as a sheet. the system draws the chrome: the sheet's own
// navigation bar carries the title with Cancel leading and the confirm
// trailing, the way ios sheets do, and the body is the Form directly with no
// scroll view around it (the native Form fills its box and scrolls itself,
// and inside a scroll view it measures zero height and paints nothing). so
// the body must be a Form or fixed content that fits. a disabled action names
// its reason above the body, beside the bar that holds the action.
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
  const insets = useSafeAreaInsets()
  const accent = useTheme()['accent-background']
  if (!accent) throw new Error('sheet screen requires accent-background')
  const close = () => router.back()
  return (
    <>
      <Stack.Screen options={{ title }}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button accessibilityLabel="Cancel" onPress={close} tintColor={accent.val}>
            <Stack.Toolbar.Label>Cancel</Stack.Toolbar.Label>
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel={action.label}
            onPress={action.onPress}
            disabled={action.disabled}
            variant="done"
            tintColor={accent.val}
          >
            <Stack.Toolbar.Label>{action.label}</Stack.Toolbar.Label>
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </Stack.Screen>
      <FormSheetFrame fill paddingBottom={insets.bottom + 12}>
        {/* the native Form draws its own grouped background and row margins
            edge to edge, so the body adds no inset around it. */}
        <YStack grow={1} shrink={1} minH={0} testID={testID}>
          {action.disabled && action.disabledReason ? (
            <SizableText
              size="2"
              color="color-11"
              text="center"
              px="4"
              pt="3"
              testID={action.testID ? `${action.testID}-reason` : 'sheet-action-reason'}
            >
              {action.disabledReason}
            </SizableText>
          ) : null}
          <YStack grow={1} shrink={1} minH={0}>
            {children}
          </YStack>
        </YStack>
      </FormSheetFrame>
    </>
  )
}
