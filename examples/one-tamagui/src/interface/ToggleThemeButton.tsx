import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons'
import { useUserScheme } from '@vxrn/color-scheme'
import { View } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon } = useToggleTheme()

  return (
    <View pointerEvents="auto" onPress={onPress}>
      <Icon size={22} />
    </View>
  )
}

export function useToggleTheme() {
  const userScheme = useUserScheme()
  const Icon =
    userScheme.setting === 'system' ? SunMoon : userScheme.setting === 'dark' ? Moon : Sun

  return {
    setting: userScheme.setting,
    scheme: userScheme.value,
    Icon,
    onPress: () => {
      const next = schemeSettings[(schemeSettings.indexOf(userScheme.setting) + 1) % 3]
      userScheme.set(next)
    },
  }
}
