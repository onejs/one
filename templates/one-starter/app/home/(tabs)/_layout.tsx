/**
 * @agent-rule
 * this is the existing signed-in tab group. extend or replace this local group
 * when changing tabs; do not add a parallel root app/(tabs) tree unless you
 * are intentionally migrating the whole route structure.
 *
 * this file is the WEB variant — `_layout.native.tsx` beside it is what native
 * resolves. that is why `100vh` is unguarded here: it never reaches the native
 * layout engine, which cannot parse CSS. do not copy a value like it into a
 * shared (non-platform-suffixed) file without giving native a plain number.
 */
import { MobileTabBar } from '~/interface/ui/tabs/MobileTabBar'
import { Slot } from 'one'
import { useState } from 'react'
import { useMedia, View, YStack } from 'tamagui'
import { MAIN_HEADER_ROW_HEIGHT, MainHeader } from '~/features/app/MainHeader'
import { useFocusedTabAction } from '~/features/app/tabAction'
import { APP_TABS } from '~/features/app/tabs'
import { BottomTabBarHeightProvider } from '~/interface/layout/bottomTabBarHeight'

export default function TabsLayout() {
  const [bottomTabBarHeight, setBottomTabBarHeight] = useState(0)
  const media = useMedia()
  // the header is fixed, so the page clears it with a spacer measured from the
  // header itself. a hardcoded height goes stale the moment the header's
  // container padding or safe-area inset changes, and the top of every screen
  // then hides under it.
  const [headerHeight, setHeaderHeight] = useState(MAIN_HEADER_ROW_HEIGHT)
  const action = useFocusedTabAction()

  return (
    // clear fixed chrome inside each scroller; publish zero where the bar hides.
    <BottomTabBarHeightProvider value={media.md ? 0 : bottomTabBarHeight}>
      <YStack minH="100vh" bg="background">
        <MainHeader onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} />
        <View height={headerHeight} />
        {/* grow into the leftover viewport, never shrink below the page. flex={1}
            alone is basis-0 and shrinks, so a page taller than the viewport put its
            bottom padding inside an overflowed box and its last element scrolled
            under the fixed tab bar. dropping flex entirely swings the other way:
            the box then measures only its content, and a screen that fills its
            parent (the virtualized feed) collapses to zero height and renders
            nothing. basis auto with grow and no shrink is the one value that does
            both. */}
        <View grow={1} shrink={0} flexBasis="auto">
          <Slot />
        </View>
        <MobileTabBar
          tabs={APP_TABS}
          action={action}
          onLayout={(event) => setBottomTabBarHeight(event.nativeEvent.layout.height)}
        />
      </YStack>
    </BottomTabBarHeightProvider>
  )
}
