import { defaultConfig as configOptions, defaultSizing } from '@tamagui/config/v5'
import { createTamagui } from '@tamagui/core'
import { animations } from './animations'

export const config = createTamagui({
  ...configOptions,
  animations,
  sizing: {
    default: '4',
    sizes: {
      ...defaultSizing.sizes,
      '2': {
        fontSize: '2',
        controlFontSize: '2',
        paddingInline: '2',
        paddingBlock: '0',
        gap: '2',
        radius: '2',
        px: { height: configOptions.tokens.size[2] - 2, icon: 16, square: 22 },
      },
      '3': {
        fontSize: '3',
        controlFontSize: '3',
        paddingInline: '3',
        paddingBlock: '0',
        gap: '3',
        radius: '3',
        px: { height: configOptions.tokens.size[3] - 2, icon: 16, square: 22 },
      },
      '4': {
        fontSize: '4',
        controlFontSize: '4',
        paddingInline: '4',
        paddingBlock: '0',
        gap: '4',
        radius: '4',
        px: { height: configOptions.tokens.size[4] - 2, icon: 16, square: 22 },
      },
      '5': {
        fontSize: '5',
        controlFontSize: '5',
        paddingInline: '5',
        paddingBlock: '0',
        gap: '5',
        radius: '5',
        px: { height: configOptions.tokens.size[5] - 2, icon: 16, square: 22 },
      },
    },
  },
  themes: {
    ...configOptions.themes,
    light: {
      ...configOptions.themes.light,
      background: 'white',
      color: 'black',
    },
    dark: {
      ...configOptions.themes.dark,
      background: 'black',
      color: 'white',
    },
  },
  media: {
    ...configOptions.media,
    xsTouch: {
      maxWidth: 660,
      pointer: 'coarse',
    },
  },
  settings: {
    ...configOptions.settings,
    fastSchemeChange: true,
    // avoids CSS bloat so long as you don't need nesting of dark/light themes
    maxDarkLightNesting: 2,
    onlyAllowShorthands: false,
  },
})

export type Conf = typeof config

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
