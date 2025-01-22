import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons'
import { useSchemeSetting } from '@vxrn/color-scheme'
import { Appearance } from 'react-native'
import { isWeb, Paragraph, YStack } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon, setting } = useToggleTheme()

  return (
    <View group items="center" containerType="normal" gap="$1">
      <View
        p="$3"
        rounded="$10"
        pointerEvents="auto"
        cursor="pointer"
        hoverStyle={{
          bg: '$color2',
        }}
        pressStyle={{
          bg: '$color1',
        }}
        onPress={onPress}
      >
        <Icon size={22} color="$color12" />
      </View>

      <YStack>
        <Paragraph
          animation="100ms"
          size="$1"
          mb={-20}
          color="$color10"
          opacity={0}
          $group-hover={{
            opacity: 1,
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
  const [{ setting, scheme }, setSchemeSetting] = useSchemeSetting()
  const Icon = setting === 'system' ? SunMoon : setting === 'dark' ? Moon : Sun

  return {
    setting,
    scheme,
    Icon,
    onPress: () => {
      const next = schemeSettings[(schemeSettings.indexOf(setting) + 1) % 3]

      if (!isWeb) {
        Appearance.setColorScheme(next === 'system' ? scheme : next)
      }

      setSchemeSetting(next)
    },
  }
}
