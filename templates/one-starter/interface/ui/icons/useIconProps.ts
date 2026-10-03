import { useTheme } from 'tamagui'
import { getIconSize } from './getIconSize'
import type { IconProps } from './types'

// the one way to turn a theme color token into an svg brush.
//
// it goes through `.get('web')`, which tamagui documents for exactly this:
// "for things like SVG, gradients, or other external components".
//
// web is what forces the choice. `.val` is a concrete hex, so the server bakes
// whichever scheme it resolved into the HTML and the client repaints it on
// hydration: the logo visibly changing color on load. `.get('web')` returns
// `var(--color-N)`, so the cascade resolves it under the theme class the svg
// actually sits in and server and client agree byte for byte. same rule the
// inline diagrams follow (see StatGraphics).
//
// on native the 'web' argument only costs an optimization, never correctness:
// it skips tamagui's DynamicColorIOS branch and returns the concrete string for
// the theme in effect, still tracking the key so the svg re-renders when the
// theme changes. react-native-svg CAN paint a DynamicColorIOS pair (extractFill
// -> extractBrush passes the object through as an RCTConvert-managed color), so
// a bare `.get()` would let ios swap light/dark without a re-render. tamagui
// only hands back that pair when the subtree still follows the OS scheme, so a
// forced <Theme> stays correct either way. restoring it is a native-only win
// and wants a simulator check first.
export function useSvgBrush(color: string): string {
  const theme = useTheme()
  return (theme[color]?.get('web') ?? theme.color?.get('web') ?? color) as string
}

// resolves the icon's tamagui size and color tokens into the plain numbers and
// color string an svg can paint with.
export function useIconProps({ size, color = 'color-11', ...restProps }: IconProps) {
  const theme = useTheme()
  const sizeValue = getIconSize(size)
  const colorValue =
    typeof color === 'string' ? ((theme[color]?.get('web') ?? color) as string) : color

  return {
    width: sizeValue,
    height: sizeValue,
    fill: colorValue,
    ...restProps,
  }
}
