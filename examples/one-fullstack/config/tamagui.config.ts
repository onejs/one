import type { CreateTamaguiProps } from '@tamagui/core'
import { setupDev } from '@tamagui/core'
import { fonts, tokens, shorthands, themes } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'
import { animations } from './animations'
import { media, mediaQueryDefaultActive } from './media'

setupDev({
  visualizer: true,
})

// avoid themes only on client bundle
const maybeThemes =
  process.env.TAMAGUI_IS_SERVER || process.env.TAMAGUI_KEEP_THEMES ? themes : ({} as typeof themes)

const config = {
  defaultFont: 'body',
  fonts,
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  animations,
  themes: maybeThemes,
  media,
  shorthands,
  tokens,
  mediaQueryDefaultActive,
  selectionStyles: (theme) => ({
    backgroundColor: theme.color5,
    color: theme.color11,
  }),
  settings: {
    allowedStyleValues: 'somewhat-strict-web',
    autocompleteSpecificTokens: 'except-special',
  },
} satisfies CreateTamaguiProps

const tamaConf = createTamagui(config)

export type Conf = typeof tamaConf

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): 'card' | 'takeoutBody' | 'content'
  }
}

export default tamaConf
