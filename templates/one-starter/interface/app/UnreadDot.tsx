import { View } from 'tamagui'

// the one unread mark in the app. it carries no count, so a row never turns
// into a number the user has to reconcile, and every surface showing "there is
// something new" looks the same.
export function UnreadDot({ size = 8 }: { size?: number }) {
  return (
    <View
      width={size}
      height={size}
      rounded={size / 2}
      bg="accent-background"
      testID="notification-unread-dot"
    />
  )
}
