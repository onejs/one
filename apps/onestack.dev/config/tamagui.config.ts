import { createAnimations } from '@tamagui/animations-css'
import { shorthands } from '@tamagui/shorthands/v2'
import { tamaguiThemes } from '@tamagui/themes/v4'
import { createTamagui } from 'tamagui'
import { fonts } from './fonts'
import { tokens } from './tokens'

const smoothBezier = 'cubic-bezier(0.215, 0.610, 0.355, 1.000)'

const cssTransitions = {
  '75ms': 'ease-in 75ms',
  '100ms': 'ease-in 100ms',
  '200ms': 'ease-in 200ms',
  bouncy: 'ease-in 200ms',
  superBouncy: 'ease-in 500ms',
  lazy: 'ease-in 1000ms',
  medium: 'ease-in 300ms',
  slow: 'ease-in 500ms',
  quick: `${smoothBezier} 500ms`,
  quicker: `${smoothBezier} 350ms`,
  quickest: `${smoothBezier} 200ms`,
  tooltip: 'ease-in 400ms',
}

const animations = createAnimations(cssTransitions)

const selectionStyles = (theme) =>
  theme.color5
    ? {
        backgroundColor: theme.color5,
        color: theme.color11,
      }
    : null

export const config = createTamagui({
  animations,
  // tamagui optimization - reduce bundle size by avoiding themes js on client
  // tamagui will hydrate it from CSS which improves lighthouse scores
  themes: process.env.VITE_ENVIRONMENT === 'client' ? ({} as typeof tamaguiThemes) : tamaguiThemes,
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
  selectionStyles,
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
    shouldAddPrefersColorThemes: true,
    themeClassNameOnRoot: true,
    maxDarkLightNesting: 1,
  },
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}

  interface TypeOverride {
    groupNames(): 'card'
  }
}

export default config
