import { One } from 'one'
import { useTheme } from 'tamagui'
import type { SfSymbolFontWeight, SfSymbolIcon, SfSymbolName } from './types'

export type { SfSymbolFontWeight, SfSymbolIcon, SfSymbolName } from './types'

// turns an SF Symbol name into an Icon, so a native symbol and a lucide icon
// are the same kind of thing and drop into the same slot.
//
// this is what lets an app keep one icon concept across platforms. an
// icons/index.ios.ts spreads the shared set and overrides only the entries that
// have a real symbol:
//
//   export const Icons = { ...BaseIcons, Home: sfSymbol('house') }
//
// the base file is icons/base.ts rather than icons/index.ts because platform
// resolution would send `./index` from inside index.ios.ts back to itself.

// SwiftUI lays a symbol out as text, so the style's point size is the symbol's
// size and its weight is the stroke. both travel through swiftStyle, which is
// One's own font binding, rather than as props.
export function sfSymbol(
  systemName: SfSymbolName,
  options: { weight?: SfSymbolFontWeight } = {},
): SfSymbolIcon {
  function SfSymbol({ size, color }: { size?: number; color?: string }) {
    // callers pass tamagui tokens the way they always have for lucide, so the
    // symbol resolves them the same way useIconProps does. a concrete color
    // passes through untouched.
    const theme = useTheme()
    const resolved =
      color === undefined ? undefined : ((theme[color]?.get('web') ?? color) as string)
    // the slot promises a size box like any svg icon: the native image only
    // measures its height, so without a width it lays out at zero wide
    const box = size ?? 17
    return (
      <One.iOS.Image
        systemName={systemName}
        style={{ width: box, height: box }}
        swiftStyle={{
          fontSize: box,
          // a weight is the stroke; without one the symbol renders regular.
          ...(options.weight === undefined ? {} : { fontWeight: options.weight }),
          // a symbol with no color takes the surrounding foreground, which is
          // how it picks up a navigation bar's tint and its pressed and
          // disabled states. only name a color when the caller asked for one.
          ...(resolved === undefined ? {} : { foregroundStyle: resolved }),
        }}
      />
    )
  }
  SfSymbol.displayName = `SfSymbol(${systemName})`
  SfSymbol.systemName = systemName
  return SfSymbol
}
