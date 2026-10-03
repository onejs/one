/**
 * @agent-rule
 * the tab set comes from features/app/tabs.ts APP_TABS; add or rename tabs
 * there. each mapped <Tabs.Screen name="X"> (and initialRouteName) must
 * match a route node named X directly under (tabs)/. a tab folder is route node X ONLY if it has
 * its own _layout.tsx — a bare (tabs)/X/index.tsx is route node X/index and will
 * NOT match, making initialRouteName HARD-THROW "Couldn't find a screen named
 * 'X'". so keep (tabs)/X/_layout.tsx for named tab folders (or use a flat
 * (tabs)/X.tsx). the default tab named index uses flat (tabs)/index.tsx; wrapping
 * it in index/_layout.tsx plus index/index.tsx creates duplicate nested names.
 * when renaming a named tab move its _layout.tsx too. push-only detail screens
 * belong OUTSIDE (tabs)/ — a sibling under app/home/ with a <Stack.Screen>.
 */
import { router, Tabs } from 'one'
import { Platform } from 'react-native'
import { useTheme } from 'tamagui'
import { useFocusedTabAction } from '~/features/app/tabAction'
import { APP_TABS, INITIAL_TAB_NAME, type AppTab } from '~/features/app/tabs'
import { NativeTabInsetsProvider } from '~/interface/layout/nativeTabInsets'

export default function TabsLayout() {
  // brand the active tab with the app's own tint instead of the platform blue:
  // accent-background, the one token a product's theme always sets and the
  // tint ~/interface/ui's MobileTabBar draws on web.
  const theme = useTheme()
  // the focused tab's action from tabAction.ts; a tab without one renders no
  // action tab, and an undeclared route file is never shown as a tab.
  const action = useFocusedTabAction()
  return (
    <NativeTabInsetsProvider value={true}>
      <Tabs
        initialRouteName={INITIAL_TAB_NAME}
        screenOptions={{
          tabBarActiveTintColor: theme['accent-background']?.val,
          sceneStyle: { backgroundColor: theme.background?.val },
          // android's navigation bar paints from the navigation theme, which
          // is react-navigation's stock grey and black: give it the theme's
          // container surface and muted text. the iOS bar is glass and takes
          // no background, so this stays android-only.
          ...Platform.select({
            android: {
              tabBarStyle: { backgroundColor: theme['color-2']?.val },
              tabBarInactiveTintColor: theme['color-11']?.val,
            },
          }),
        }}
      >
        {APP_TABS.map((tab: AppTab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.label,
              tabBarButtonTestID: `native-tab-${tab.name}`,
              tabBarIcon: ({ focused }: { focused: boolean }) =>
                Platform.select({
                  ios: {
                    type: 'sfSymbol',
                    name: focused ? (tab.sfSymbolFocused ?? tab.sfSymbol) : tab.sfSymbol,
                  },
                  android: { type: 'materialSymbol', name: tab.materialSymbol },
                }),
            }}
          />
        ))}
        {action && (
          <Tabs.Screen
            name="action"
            listeners={{
              tabPress: () => {
                router.push(action.href)
                action.onPress?.()
              },
            }}
            options={{
              title: action.label,
              tabBarAccessibilityLabel: action.label,
              tabBarButtonTestID: action.testID,
              tabBarSelectionEnabled: false,
              // one fork: the prominent tab detaches into its own glass
              // circle beside the tab pill on ios 27+. below that (and on
              // android) it renders inline like any other tab.
              tabBarProminent: Platform.OS === 'ios' ? true : undefined,
              tabBarIcon: Platform.select({
                ios: { type: 'sfSymbol', name: action.sfSymbol },
                android: { type: 'materialSymbol', name: action.materialSymbol },
              }),
            }}
          />
        )}
      </Tabs>
    </NativeTabInsetsProvider>
  )
}
