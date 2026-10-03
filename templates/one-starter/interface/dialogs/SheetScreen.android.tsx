import { useRouter, useSafeAreaInsets } from 'one'
import { useState } from 'react'
import { ScrollView, Separator, SizableText, XStack, YStack } from 'tamagui'
import { Pressable } from '~/interface/buttons/Pressable'
import { Icons } from '~/interface/icons'
import type { ReactNode } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

// a route presented as a sheet. on android the sheet is an M3 full-screen
// dialog: a full-screen surface with a 64dp top app bar carrying the close,
// the title-large, and the confirm as a trailing text button, and the fields
// scrolling below a divider that appears once the content moves. a disabled
// action names its reason under the bar, beside the action it explains.
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
  const [scrolled, setScrolled] = useState(false)
  const close = () => router.back()
  return (
    <YStack
      flex={1}
      bg="background"
      pt={insets.top}
      pb={insets.bottom}
      transition="quick"
      opacity="enter:0"
      testID={testID}
    >
      <XStack minH={64} items="center" pl={4} pr={8} gap={8}>
        <Pressable
          aria-label="Close"
          onPress={close}
          w={48}
          h={48}
          shrink={0}
          items="center"
          justify="center"
        >
          <Icons.Close size={24} color="color" />
        </Pressable>
        {/* M3 title-large is 22/28; xl (20/28) is the scale's nearest step
            with the exact line height. */}
        <SizableText flex={1} size="xl" color="color" numberOfLines={1}>
          {title}
        </SizableText>
        <Pressable
          aria-label={action.label}
          aria-disabled={action.disabled}
          onPress={action.disabled ? undefined : action.onPress}
          opacity={action.disabled ? 0.5 : 1}
          minH={48}
          px={12}
          shrink={0}
          items="center"
          justify="center"
          testID={action.testID}
        >
          <SizableText size="sm" fontWeight="500" color="accent-background">
            {action.label}
          </SizableText>
        </Pressable>
      </XStack>
      {scrolled ? <Separator /> : null}
      {action.disabled && action.disabledReason ? (
        <SizableText
          size="2"
          color="color-11"
          text="center"
          px={16}
          pt={8}
          testID={action.testID ? `${action.testID}-reason` : 'sheet-action-reason'}
        >
          {action.disabledReason}
        </SizableText>
      ) : null}
      <ScrollView
        flex={1}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) =>
          setScrolled(event.nativeEvent.contentOffset.y > 0)
        }
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </YStack>
  )
}
