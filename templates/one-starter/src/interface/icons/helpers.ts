import { getTokenValue, type SizeTokens } from 'tamagui'
export const getIconSize = (size?: number | SizeTokens, defaultSize = 28): number => {
  if (size === undefined) {
    return defaultSize
  }
  if (typeof size === 'number') {
    return size
  }
  return getTokenValue(size as any, 'size')
}
