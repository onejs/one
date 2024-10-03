import { isWeb, View } from 'tamagui'
import { Slot, Stack } from 'one'
import { ToggleThemeButton } from '~/code/theme/ToggleThemeButton'
import { Logo } from '~/code/brand/Logo'

export default function FeedLayout() {
  return (
    <View flex={1}>
      {isWeb ? (
        <Slot />
      ) : (
        <Stack
          screenOptions={{
            headerRight() {
              return (
                <View px="$2">
                  <ToggleThemeButton />
                </View>
              )
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Feed',
              headerLeft() {
                return <Logo />
              },
            }}
          />
          <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
        </Stack>
      )}
    </View>
  )
}
