import { isDarkThemeName } from '../theme/useIsDarkTheme'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

// the kit's glass on web, where the platform has no material of its own: a
// translucent fill of the theme's lightest steps over backdrop blur, an inset
// top highlight and a hairline rim, fitted from the MobileTabBar treatment.
// ramp tokens resolve inside the surface's theme, so a themed surface (an
// error toast, a toggled button) tints while staying in appearance. `clear`
// lets more of what is behind show through.
export const GLASS = {
  light: {
    regular: 'color-1/60',
    clear: 'color-1/35',
    backdrop: 'blur(20px) saturate(1.8)',
    rim: 'inset 0 1px 1px color-1/80, 0 0 0 0.5px shadow-3',
  },
  dark: {
    regular: 'color-3/45',
    clear: 'color-3/25',
    backdrop: 'blur(20px) saturate(1.8) brightness(1.25)',
    rim: 'inset 0 1px 1px color/25, 0 0 0 0.5px shadow-3',
  },
} as const

export const glassFor = (themeName: string) =>
  GLASS[isDarkThemeName(themeName) ? 'dark' : 'light']

// floating glass lifts off what it floats over.
export const GLASS_LIFT = '0 4px 14px shadow-2'

export type GlassViewProps = {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  glassEffectStyle?: 'regular' | 'clear'
  // glass is a capsule unless given corners; a card needs them.
  cornerRadius?: number
  accessibilityLabel?: string
}
