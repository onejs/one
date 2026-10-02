import { useUserScheme } from '@vxrn/color-scheme'
import { styled, View } from 'tamagui'
import { Button } from '~/interface/buttons/Button'
import { CircleHalfIcon } from '~/interface/icons/phosphor/CircleHalfIcon'
import { MoonStarsIcon } from '~/interface/icons/phosphor/MoonStarsIcon'
import { SunIcon } from '~/interface/icons/phosphor/SunIcon'
import type { SizeTokens } from 'tamagui'
const IconContainer = styled(View, {
  transition: 'quick',
  position: 'absolute',
  opacity: 0,
  pointerEvents: 'none',
  variants: {
    active: {
      true: {
        opacity: 1,
      },
    },
  } as const,
})
const schemeSettings = ['light', 'dark', 'system'] as const
export function ThemeSwitch({ size = '2' }: { size?: SizeTokens }) {
  const { onPress, setting } = useToggleTheme()
  const iconSize = size === '1' ? 16 : size === '2' ? 20 : size === '3' ? 24 : 28
  return (
    <View items="center" gap="1">
      <Button
        onPress={onPress}
        transition="medium"
        circular
        aria-label="Toggle theme"
        scale={{
          press: 0.9,
          hover: 1.05,
        }}
        opacity={{
          press: 0.8,
        }}
      >
        <IconContainer active={setting === 'light'}>
          <SunIcon size={iconSize} />
        </IconContainer>
        <IconContainer active={setting === 'dark'}>
          <MoonStarsIcon size={iconSize} />
        </IconContainer>
        <IconContainer active={setting === 'system'}>
          <CircleHalfIcon size={iconSize} />
        </IconContainer>
      </Button>
    </View>
  )
}
export function useToggleTheme() {
  const userScheme = useUserScheme()
  const Icon =
    userScheme.setting === 'system'
      ? CircleHalfIcon
      : userScheme.setting === 'dark'
        ? MoonStarsIcon
        : SunIcon
  return {
    setting: userScheme.setting,
    scheme: userScheme.value,
    Icon,
    onPress: () => {
      const currentIndex = schemeSettings.indexOf(userScheme.setting)
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % 3 : 0
      const next = schemeSettings[nextIndex]!
      userScheme.set(next)
    },
  }
}
ThemeSwitch.title = 'Theme Switch'
