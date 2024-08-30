import { View } from '@tamagui/core'
import { useUserTheme } from '@tamagui/one-theme'
import { Appearance } from 'react-native'
import { Stack } from 'vxs'

export default function Layout() {
  const [{ resolvedTheme }, setTheme] = useUserTheme()

  return (
    <>
      <Stack
        screenOptions={{
          headerRight(props) {
            return (
              <View
                width={50}
                height={50}
                bg="red"
                onPress={() => {
                  const next = resolvedTheme === 'light' ? 'dark' : 'light'
                  Appearance.setColorScheme(next)
                  setTheme(next)
                }}
              >
                {/* <Moon size={24} /> */}
              </View>
            )
          },
        }}
      />
    </>
  )
}
