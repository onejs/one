import { KeyboardStickyView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { KeyboardStickyFooterProps } from './KeyboardStickyFooter'
export const KeyboardStickyFooter = ({
  children,
  offset,
  openedOffset = 0,
}: KeyboardStickyFooterProps) => {
  const { bottom } = useSafeAreaInsets()
  return (
    <KeyboardStickyView
      offset={{
        closed: offset || -bottom,
        opened: openedOffset || 0,
      }}
    >
      {children}
    </KeyboardStickyView>
  )
}
