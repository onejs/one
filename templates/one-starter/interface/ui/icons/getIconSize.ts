import { getTokens, getVariableValue, type SizeTokens } from 'tamagui'

let sizeTokens: ReturnType<typeof getTokens>['size'] | undefined

export const getIconSize = (size?: number | SizeTokens, defaultSize = 28): number => {
  if (size === undefined) {
    return defaultSize
  }
  if (typeof size === 'number') {
    return size
  }
  const tokenName = String(size).replace(/^\$/, '')
  const token = Reflect.get((sizeTokens ??= getTokens().size), tokenName)
  const value = token ? getVariableValue(token) : undefined
  if (typeof value === 'number') return value
  throw new Error(`unknown Tamagui icon size token "${String(size)}"`)
}
