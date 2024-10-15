import { Slot, Stack } from 'one'
import { isWeb, View } from 'tamagui'
import { Logo } from '~/src/brand/Logo'
import { ToggleThemeButton } from '~/src/theme/ToggleThemeButton'

export default function FeedLayout() {
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
            options={{
              title: 'Feed',
              gestureEnabled: true,
              headerLeft() {
                return <Logo />
              },
            }}
          />
          <Stack.Screen name="post/[id]" />
        </Stack>
      )}
    </View>
  )
}
