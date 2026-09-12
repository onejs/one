import { NavigationRouteContext } from '@react-navigation/core'
import { Slot, Stack } from 'one'
import { useContext } from 'react'
import { isWeb, View } from 'tamagui'
import { Logo } from '~/code/brand/Logo'
import { ToggleThemeButton } from '~/code/theme/ToggleThemeButton'

export default function FeedLayout() {
  const routeContext = useContext(NavigationRouteContext)
  const { name } = routeContext || {}

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
        </Stack>
      )}
    </View>
  )
}
