import { useThemeName } from 'tamagui'

// a theme name reads left to right: `light` sets the light scheme, `dark` and
// `black` the dark one, `inverse` flips whatever came before. so `light_black`
// is dark (black pins it against the system) and `dark_inverse` is light.
export function isDarkThemeName(name: string): boolean {
  let dark = false
  for (const part of name.split('_')) {
    if (part === 'light') dark = false
    else if (part === 'dark' || part === 'black') dark = true
    else if (part === 'inverse') dark = !dark
  }
  return dark
}

export const useIsDarkTheme = () => isDarkThemeName(useThemeName())
