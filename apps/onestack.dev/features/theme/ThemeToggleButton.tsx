import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from '~/features/icons/lucide'
import { useUserScheme } from '@vxrn/color-scheme'
import { Paragraph, YStack } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon, setting } = useToggleTheme()

  return (
    <View group containerType="normal" gap="1" ml="sm:2" alignItems="center">
      <View
        p="3"
        bg="hover:color2 press:color1"
        pointerEvents="auto"
        br="10"
        cur="pointer"
        onPress={onPress}
        role="button"
        aria-label="Toggle theme"
      >
        <Icon size={22} color="color12" />
      </View>

      <YStack>
        <Paragraph
          transition="100ms"
          size="1"
          mb={-20}
          color="color10"
          opacity="0 group-hover:1"
        >
          {setting[0].toUpperCase()}
          {setting.slice(1)}
        </Paragraph>
      </YStack>
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
