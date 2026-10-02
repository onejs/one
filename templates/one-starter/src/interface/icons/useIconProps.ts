import { useTheme } from 'tamagui'
import { getIconSize } from './helpers'
import type { IconProps } from './types'
import type { ColorTokens } from 'tamagui'
export const useIconProps = ({
  size,
  color = 'color-11' as ColorTokens,
  ...restProps
}: IconProps) => {
  const theme = useTheme()
  const sizeValue = getIconSize(size)

  // use .get() for css var() instead of hardcoded value for ssr
  const colorValue = theme[color]?.get() || theme['color-11'].get()
  return {
    width: sizeValue,
    height: sizeValue,
    fill: colorValue,
    ...restProps,
  }
}
