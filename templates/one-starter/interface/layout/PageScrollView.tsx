import { YStack, type YStackProps } from 'tamagui'
import { useBottomTabBarHeight } from './bottomTabBarHeight'

type PageScrollViewProps = YStackProps & {
  contentPaddingBottom?: number
  contentPaddingTop?: number
  keyboardDismissMode?: 'none' | 'interactive' | 'on-drag'
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never' | boolean
  scrollEnabled?: boolean
  showsVerticalScrollIndicator?: boolean
  // native only: see PageScrollView.native.tsx
  startUnderBar?: boolean
}

/**
 * @agent-rule
 * page-level scroll, web side (native lives in PageScrollView.native.tsx —
 * it needs an explicit flex:1 ScrollView plus floating-tab-bar clearance).
 * web must NOT use a flex:1 scroll area — it collapses to a 0-height body
 * and clips the whole page to blank on the deployed web app. this renders a
 * column that grows from its content height, never below it, and the document
 * scrolls naturally. as on native, the caller's props (padding, gap,
 * alignment, flex) land on the inner column. use this for any scrolling
 * screen body; never hand-roll a flex:1 scroll area on web.
 *
 * this is also where the fixed bottom tab bar is cleared. the bar overlays the
 * page, and padding a wrapper around the scroller is dropped from the scroll
 * extent, so the clearance belongs here, inside the box that scrolls.
 */
export function PageScrollView({
  children,
  contentPaddingBottom = 0,
  contentPaddingTop = 0,
  keyboardDismissMode: _keyboardDismissMode,
  keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
  scrollEnabled: _scrollEnabled,
  showsVerticalScrollIndicator: _showsVerticalScrollIndicator,
  startUnderBar: _startUnderBar,
  ...props
}: PageScrollViewProps) {
  const bottomTabBarHeight = useBottomTabBarHeight()

  return (
    <YStack flexGrow={1} pt={contentPaddingTop} pb={contentPaddingBottom + bottomTabBarHeight}>
      <YStack flexGrow={1} {...props}>
        {children}
      </YStack>
    </YStack>
  )
}
