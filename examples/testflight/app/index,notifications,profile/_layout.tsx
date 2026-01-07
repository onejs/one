import { useContext } from 'react'
import { isWeb, View } from 'tamagui'
import { Slot, Stack, usePathname } from 'one'
import { NavigationRouteContext } from '@react-navigation/core'
import { ToggleThemeButton } from '~/code/theme/ToggleThemeButton'
import { Logo } from '~/code/brand/Logo'

export default function FeedLayout() {
  const routeContext = useContext(NavigationRouteContext)
  const { name } = routeContext || {} // Note: we can't use `usePathname()` here since its value will update every time the tab switches and will cause unnecessary re-renders

  return (
    <View flex={1}>
      {isWeb ? (
        <Slot />
      ) : (
        <Stack
          screenOptions={({ route }) => {
            return {
              title: (route?.params as any)?.preloadTitle || undefined,
              headerRight() {
                return (
                  <View px="$2">
                    <ToggleThemeButton />
                  </View>
                )
              },
            }
          }}
        >
          <Stack.Screen
            name="index"
            options={
              name === 'index'
                ? {
                    title: 'Feed',
                    gestureEnabled: true,
                    headerLeft() {
                      return <Logo mr="$4" />
                    },
                  }
                : { headerShown: false }
            }
          />
          <Stack.Screen name="post/[id]" />
        </Stack>
      )}
    </View>
  )
}
