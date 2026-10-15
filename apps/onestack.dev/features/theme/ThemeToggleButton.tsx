import { useHydrated } from '@tanstack/react-router'
import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from '~/components/icons'
import { useUserScheme } from '@vxrn/color-scheme'
import { Paragraph, YStack } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon, setting } = useToggleTheme()

  return (
    <View group containerType="normal" gap="1" marginLeft="sm:2" alignItems="center">
      <View
        padding="3"
        backgroundColor="hover:color2 press:color1"
        pointerEvents="auto"
        borderRadius="10"
        cursor="pointer"
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
          marginBottom={-20}
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
  const hydrated = useHydrated()
  const setting = hydrated ? userScheme.setting : 'system'
  const Icon =
    setting === 'system' ? SunMoon : setting === 'dark' ? Moon : Sun

  return {
    setting,
    scheme: userScheme.value,
    Icon,
    onPress: () => {
      const next = schemeSettings[(schemeSettings.indexOf(userScheme.setting) + 1) % 3]
      userScheme.set(next)
    },
  }
}
