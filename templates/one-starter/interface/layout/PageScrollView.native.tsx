import { HeaderHeightContext } from '@react-navigation/elements'
import { useSafeAreaInsets } from 'one'
import { useContext } from 'react'
import { Platform, ScrollView, type ScrollViewProps } from 'react-native'
import { useTheme, YStack, type YStackProps } from 'tamagui'
import { useNativeTabInsetsOwned } from './nativeTabInsets'

type PageScrollViewProps = YStackProps & {
  contentPaddingBottom?: number
  contentPaddingTop?: number
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode']
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps']
  scrollEnabled?: boolean
  showsVerticalScrollIndicator?: boolean
  // the page starts under the tab root's untitled transparent bar, clearing
  // only the status bar, for a page whose layout already keeps its top
  // trailing corner free for the settings gear. the layout also hides the
  // bar's top scroll edge effect, which would otherwise blur that content.
  startUnderBar?: boolean
}

/**
 * @agent-rule
 * native page-level scroll (web renders a growing column the document
 * scrolls — see the sibling PageScrollView.tsx). this primitive owns safe-area insets,
 * native-tab safe-area clearance and screen-specific content padding.
 */
export function PageScrollView({
  children,
  testID,
  contentPaddingBottom = 0,
  contentPaddingTop = 0,
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  scrollEnabled,
  showsVerticalScrollIndicator = false,
  startUnderBar = false,
  ...props
}: PageScrollViewProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const nativeTabsOwnInsets = useNativeTabInsetsOwned()
  // a tab root's bar floats transparent over its page. under ios native tabs
  // automatic adjustment clears the status bar and that bar. adding insets.top
  // again doubles it. android has no automatic adjustment, so under its tabs the page
  // clears the header height (status bar included) itself, zero where the
  // screen shows no header. everywhere else (stacks, auth) manual status-bar
  // padding stays.
  const headerHeight = useContext(HeaderHeightContext) ?? 0
  const underBar = nativeTabsOwnInsets && startUnderBar
  const manualTop = !nativeTabsOwnInsets
    ? insets.top
    : Platform.OS === 'ios'
      ? 0
      : underBar
        ? insets.top
        : Math.max(insets.top, headerHeight)
  // ios's automatic inset always clears the bar, so a page that starts under
  // it gives that bar height back
  const iosBarGiveBack =
    underBar && Platform.OS === 'ios' ? Math.max(0, headerHeight - insets.top) : 0
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: theme.background?.val }}
      scrollEnabled={scrollEnabled}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      contentInsetAdjustmentBehavior={
        nativeTabsOwnInsets && Platform.OS === 'ios' ? 'automatic' : 'never'
      }
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: manualTop + contentPaddingTop,
        paddingBottom: Math.max(insets.bottom, 12) + contentPaddingBottom,
        // side insets are chrome too: the open duo's system column takes the
        // trailing edge, a landscape phone its notch side.
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <YStack flex={1} bg="background" mt={-iosBarGiveBack} {...props}>
        {children}
      </YStack>
    </ScrollView>
  )
}
