import { NavigationRouteContext } from '@react-navigation/core'
import { Slot, Stack } from 'one'
import { useContext } from 'react'
import { isWeb, View } from 'tamagui'
import { Logo } from '~/code/brand/Logo'
import { ToggleThemeButton } from '~/code/theme/ToggleThemeButton'

export default function FeedLayout() {
  const routeContext = useContext(NavigationRouteContext)
  const { name } = routeContext || {}
  const isFeed = name === 'index' || name?.startsWith('__one_layout:')

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
              isFeed
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
          {isFeed ? <Stack.Screen name="post/[id]" /> : null}
        </Stack>
      )}
    </View>
  )
}
