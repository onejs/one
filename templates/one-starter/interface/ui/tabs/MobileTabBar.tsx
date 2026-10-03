import { useWindowDimensions } from '@tamagui/use-window-dimensions'
import { Link, usePathname, type Href } from 'one'
import { SizableText, View, XStack, type ColorTokens } from 'tamagui'
import type { Icon, IconComponent } from '../icons/types'

type MeasuredLayoutEvent = {
  nativeEvent: { layout: { x: number; y: number; width: number; height: number } }
}

/**
 * @agent-rule
 * the phone-width web tab bar, drawn as the ios 27 UITabBar: icon-plus-label
 * tabs in a liquid glass pill, a neutral glass lens under the selected tab,
 * which tints icon and label while the rest stay the label color, and the
 * optional action as its own glass circle trailing the pill (the ios 27
 * prominent tab); without an action the pill centers. every number here is
 * read off a UIKit capture on the iPhone 17 Pro simulator; the measurements
 * tabs and action and never restyles the glass.
 */

export type MobileTabBarTab = {
  // stable id, used for the tab's test id
  name: string
  label: string
  href: Href
  icon: Icon
}

export type MobileTabBarAction = {
  // accessible name of the circle
  label: string
  // where the tap lands; the tap never selects a tab
  href: Href
  // runs after navigating, for a request the screen at href subscribes to
  onPress?: () => void
  icon: IconComponent
  // the circle's test id
  testID: string
}

type MobileTabBarProps = {
  onLayout?: (event: MeasuredLayoutEvent) => void
  tabs: readonly MobileTabBarTab[]
  // null or omitted drops the circle and centers the pill
  action?: MobileTabBarAction | null
  // the selected tab's icon and label color, uikit's tintColor
  tint?: ColorTokens
  // the media condition where the bar gives way to desktop navigation
  hiddenFrom?: 'sm' | 'md' | false
}

// uikit geometry: the pill and the action circle are 62pt tall, 21pt in from
// the sides and the bottom edge, 8pt apart. each tab button is 8pt wider than
// its pitch, 86pt at rest, so the pill pads 8pt a side; the selection lens is
// the button frame, 4pt inside the pill rims.
const BAR_HEIGHT = 62
const EDGE_INSET = 21
const ACTION_GAP = 8
const TAB_PITCH = 86
const LENS_INSET = 4

// liquid glass, fitted to the uikit pill over flat black, grey and white
// backdrops: a light fill in light mode, a dark fill over a brightened backdrop
// in dark mode. the lens sits over the pill and deepens it the way uikit does,
const GLASS_LENS = 'brightness(0.81) contrast(1.4) dark:brightness(0.76) contrast(1.14)'

// the pill and the circle share one glass surface.
const glassSurface = {
  rounded: BAR_HEIGHT / 2,
  borderCurve: 'continuous',
  bg: 'color-1/53 dark:color-3/40',
  backdropFilter: 'blur(10px) saturate(2) dark:blur(10px) saturate(2) brightness(1.33)',
  boxShadow:
    'inset 0 1px 1px color-1/80, 0 0 0 0.5px shadow-3, 0 4px 12px shadow-1 dark:inset 0 1px 1px color/25, inset 0 -1px 1px color/20',
} as const

const DISPLAY = {
  sm: 'flex sm:none',
  md: 'flex md:none',
} as const

export function MobileTabBar({
  tabs,
  action,
  tint = 'accent-background',
  hiddenFrom = 'md',
  onLayout,
}: MobileTabBarProps) {
  const pathname = usePathname()
  const { width } = useWindowDimensions()
  const activeIndex = tabs.findIndex(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  )

  // uikit sizes the pill to its tabs and caps it at the room beside the
  // action; when less than one pitch would be left over it fills that room,
  // and past it the pitch compresses.
  const room = width - EDGE_INSET * 2 - (action ? BAR_HEIGHT + ACTION_GAP : 0)
  const natural = LENS_INSET * 4 + TAB_PITCH * tabs.length
  const pillWidth = natural > room - TAB_PITCH ? room : natural
  const pitch = (pillWidth - LENS_INSET * 4) / tabs.length

  return (
    <XStack
      position="fixed"
      b={0}
      l={0}
      r={0}
      px={EDGE_INSET}
      pb={EDGE_INSET}
      items="flex-end"
      justify={action ? 'space-between' : 'center'}
      display={hiddenFrom ? DISPLAY[hiddenFrom] : 'flex'}
      pointerEvents="box-none"
      z={100}
      onLayout={onLayout}
    >
      <XStack width={pillWidth} height={BAR_HEIGHT} px={LENS_INSET * 2}>
        {/* the pill paints its glass on a layer of its own so the lens, a
            sibling above it, filters the finished glass; a backdrop filter
            nested inside another only sees its parent. */}
        <View
          position="absolute"
          t={0}
          r={0}
          b={0}
          l={0}
          pointerEvents="none"
          {...glassSurface}
        />
        {activeIndex >= 0 && (
          <View
            position="absolute"
            t={LENS_INSET}
            b={LENS_INSET}
            l={LENS_INSET}
            width={pitch + LENS_INSET * 2}
            rounded={(BAR_HEIGHT - LENS_INSET * 2) / 2}
            borderCurve="continuous"
            backdropFilter={GLASS_LENS}
            x={activeIndex * pitch}
            transition="medium"
            pointerEvents="none"
          />
        )}
        {tabs.map((tab, index) => {
          const TabIcon = tab.icon
          const selected = index === activeIndex
          const color = selected ? tint : 'color'

          return (
            <Link key={tab.name} href={tab.href} asChild>
              <View
                render="a"
                cursor="pointer"
                width={pitch}
                height={BAR_HEIGHT}
                items="center"
                pt={12}
                gap={3}
                aria-label={`${tab.label} tab`}
                testID={`web-tab-${tab.name}`}
              >
                <View shrink={0}>
                  <TabIcon size={24} color={color} />
                </View>
                <SizableText
                  fontSize={10}
                  lineHeight="12px"
                  fontWeight={selected ? '600' : '500'}
                  color={color}
                >
                  {tab.label}
                </SizableText>
              </View>
            </Link>
          )
        })}
      </XStack>

      {action && (
        <Link href={action.href} asChild>
          <View
            render="a"
            cursor="pointer"
            width={BAR_HEIGHT}
            height={BAR_HEIGHT}
            items="center"
            justify="center"
            {...glassSurface}
            onPress={action.onPress}
            aria-label={action.label}
            testID={action.testID}
          >
            <action.icon size={28} color="color" strokeWidth={2.15} />
          </View>
        </Link>
      )}
    </XStack>
  )
}
