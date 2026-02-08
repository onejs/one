import { animations } from '@tamagui/config/v5-css'
import { themes } from '@tamagui/themes/v5'
import { createTamagui } from 'tamagui'
import { fonts } from './fonts'
import { tokens } from './tokens'

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
  themes: process.env.VITE_ENVIRONMENT === 'client' ? ({} as typeof themes) : themes,
  media: {
    xl: { maxWidth: 1450 },
    lg: { maxWidth: 1180 },
    md: { maxWidth: 1020 },
    sm: { maxWidth: 800 },
    xs: { maxWidth: 660 },
    xxs: { maxWidth: 390 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 980 + 1 },
    gtLg: { minWidth: 1180 + 1 },
    gtXl: { minWidth: 1450 + 1 },
  },
  tokens,
  fonts,
  selectionStyles,
  shorthands: {
    ussel: 'userSelect',
    cur: 'cursor',
    pe: 'pointerEvents',
    col: 'color',
    ff: 'fontFamily',
    fos: 'fontSize',
    fost: 'fontStyle',
    fow: 'fontWeight',
    ls: 'letterSpacing',
    lh: 'lineHeight',
    ta: 'textAlign',
    tt: 'textTransform',
    ww: 'wordWrap',
    ac: 'alignContent',
    ai: 'alignItems',
    als: 'alignSelf',
    b: 'bottom',
    bg: 'backgroundColor',
    bbc: 'borderBottomColor',
    bblr: 'borderBottomLeftRadius',
    bbrr: 'borderBottomRightRadius',
    bbw: 'borderBottomWidth',
    blc: 'borderLeftColor',
    blw: 'borderLeftWidth',
    bc: 'borderColor',
    br: 'borderRadius',
    bs: 'borderStyle',
    brw: 'borderRightWidth',
    brc: 'borderRightColor',
    btc: 'borderTopColor',
    btlr: 'borderTopLeftRadius',
    btrr: 'borderTopRightRadius',
    btw: 'borderTopWidth',
    bw: 'borderWidth',
    dsp: 'display',
    f: 'flex',
    fb: 'flexBasis',
    fd: 'flexDirection',
    fg: 'flexGrow',
    fs: 'flexShrink',
    fw: 'flexWrap',
    h: 'height',
    jc: 'justifyContent',
    l: 'left',
    m: 'margin',
    mah: 'maxHeight',
    maw: 'maxWidth',
    mb: 'marginBottom',
    mih: 'minHeight',
    miw: 'minWidth',
    ml: 'marginLeft',
    mr: 'marginRight',
    mt: 'marginTop',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    o: 'opacity',
    ov: 'overflow',
    p: 'padding',
    pb: 'paddingBottom',
    pl: 'paddingLeft',
    pos: 'position',
    pr: 'paddingRight',
    pt: 'paddingTop',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    r: 'right',
    shac: 'shadowColor',
    shar: 'shadowRadius',
    shof: 'shadowOffset',
    shop: 'shadowOpacity',
    t: 'top',
    w: 'width',
    zi: 'zIndex',
  } as const,
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
    addThemeClassName: 'html',
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
