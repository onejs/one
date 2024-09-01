import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons'
import { useSchemeSetting } from '@vxrn/color-scheme'
import { Appearance } from 'react-native'
import { isWeb } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const [{ setting, scheme }, setSchemeSetting] = useSchemeSetting()
  const Icon = setting === 'system' ? SunMoon : setting === 'dark' ? Moon : Sun

  return (
    <View
      p="$8"
      pointerEvents="auto"
      onPress={() => {
        const next = schemeSettings[(schemeSettings.indexOf(setting) + 1) % 3]

        if (!isWeb) {
          Appearance.setColorScheme(next === 'system' ? scheme : next)
        }

        setSchemeSetting(next)
      }}
    >
      <Icon size={24} />
    </View>
  )
}
