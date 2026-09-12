import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'

type NativeTabsScreen = {
  name?: string
  options?: BottomTabNavigationOptions | ((props: any) => BottomTabNavigationOptions)
}

export function processNativeTabsScreens<T extends NativeTabsScreen>(screens: T[]): T[] {
  return screens.map((screen) => {
    if (typeof screen.options === 'function') {
      const getOptions = screen.options
      return {
        ...screen,
        options: (props: any) => {
          const options = getOptions(props)
          assertNoNativeTabsHref(screen.name, options)
          return options
        },
      }
    }

    assertNoNativeTabsHref(screen.name, screen.options)
    return screen
  }) as T[]
}

function assertNoNativeTabsHref(
  screenName: string | undefined,
  options: BottomTabNavigationOptions | undefined
) {
  if (options && 'href' in options) {
    throw new Error(
      `Tabs.Screen "${screenName ?? ''}" uses the web-only href option. ` +
        'Native tabs use the route name. Put non-tab routes in a parent Stack, ' +
        'and move custom href options to a .web layout.'
    )
  }
}
