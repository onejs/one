import { createMedia } from '@tamagui/react-native-media-driver'

// note order is important!
// earlier defined = less important

export const media = createMedia({
  xl: { maxWidth: 1650 },
  lg: { maxWidth: 1280 },
  md: { maxWidth: 1020 },
  sm: { maxWidth: 800 },
  xs: { maxWidth: 660 },
  xxs: { maxWidth: 390 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  gtXl: { minWidth: 1650 + 1 },
  pointerFine: { pointer: 'fine' },
})

// note all the non "gt" ones should be true to start to match mobile-first
// were aiming for "xs" to be the default to "gtXs" true too
export const mediaQueryDefaultActive = {
  xl: true,
  lg: true,
  md: true,
  sm: true,
  xs: true,
  // false
  xxs: false,
}
