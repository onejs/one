import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons'
import { useUserScheme } from '@vxrn/color-scheme'
import { Paragraph, YStack } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon, setting } = useToggleTheme()

  return (
    <View group ai="center" containerType="normal" gap="$1">
      <View
        p="$3"
        br="$10"
        hoverStyle={{
          bg: '$color2',
        }}
        pressStyle={{
          bg: '$color1',
        }}
        pointerEvents="auto"
        cur="pointer"
        onPress={onPress}
        role="button"
        aria-label="Toggle theme"
      >
        <Icon size={22} color="$color12" />
      </View>

      <YStack>
        <Paragraph
          animation="100ms"
          size="$1"
          mb={-20}
          color="$color10"
          o={0}
          $group-hover={{
            o: 1,
          }}
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
  const Icon = userScheme.setting === 'system' ? SunMoon : userScheme.setting === 'dark' ? Moon : Sun

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
