import { fonts, tokens } from '@tamagui/config/v4'
import { shorthands } from '@tamagui/shorthands/v2'
import { tamaguiThemes } from '@tamagui/themes/v4'
import { createTamagui } from 'tamagui'
import { animations } from './animations'

export const config = createTamagui({
  animations,
  themes: tamaguiThemes,
  media: {
    xl: { maxWidth: 1450 },
    lg: { maxWidth: 1180 },
    md: { maxWidth: 1020 },
    sm: { maxWidth: 800 },
    xs: { maxWidth: 660 },
    xxs: { maxWidth: 390 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1180 + 1 },
    gtXl: { minWidth: 1450 + 1 },
  },
  tokens,
  fonts,
  selectionStyles: (theme) =>
    theme.color5
      ? {
          backgroundColor: theme.color5,
          color: theme.color11,
        }
      : null,
  shorthands,
  settings: {
    mediaQueryDefaultActive: {
      xl: true,
      lg: true,
      md: true,
      sm: true,
      xs: true,
      // false
      xxs: false,
    },
    defaultFont: 'body',
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: false,
    themeClassNameOnRoot: true,
    maxDarkLightNesting: 1,
  },
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): 'message' | 'icon'
  }
}

export default config
