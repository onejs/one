import type { Theme } from '@react-navigation/native'

// web copy of react-navigation's themes (MIT). importing them from the package
// pulls in its theming/fonts, which reads react-native's Platform. the .native
// sibling re-exports the real ones so native stays byte-identical.

const WEB_FONT_STACK =
  'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'

const fonts = {
  regular: { fontFamily: WEB_FONT_STACK, fontWeight: '400' },
  medium: { fontFamily: WEB_FONT_STACK, fontWeight: '500' },
  bold: { fontFamily: WEB_FONT_STACK, fontWeight: '600' },
  heavy: { fontFamily: WEB_FONT_STACK, fontWeight: '700' },
} as const

export const DefaultTheme: Theme = {
  dark: false,
  colors: {
    primary: 'rgb(0, 122, 255)',
    background: 'rgb(242, 242, 242)',
    card: 'rgb(255, 255, 255)',
    text: 'rgb(28, 28, 30)',
    border: 'rgb(216, 216, 216)',
    notification: 'rgb(255, 59, 48)',
  },
  fonts,
}

export const DarkTheme: Theme = {
  dark: true,
  colors: {
    primary: 'rgb(10, 132, 255)',
    background: 'rgb(1, 1, 1)',
    card: 'rgb(18, 18, 18)',
    text: 'rgb(229, 229, 231)',
    border: 'rgb(39, 39, 41)',
    notification: 'rgb(255, 69, 58)',
  },
  fonts,
}
