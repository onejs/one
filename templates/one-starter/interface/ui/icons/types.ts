import type { SfSymbolCatalogAddition } from './generated/sfSymbolCatalogAdditions'
import type { ComponentType } from 'react'
import type { ColorValue } from 'react-native'
import type { SvgProps } from 'react-native-svg'
import type { SFSymbol } from 'sf-symbols-typescript'
import type { ColorTokens, SizeTokens } from 'tamagui'

// the exact installed Apple catalog. the dependency carries the stable union;
// the generated additions close any gap when the local SF Symbols app moves
// ahead of that package. invented names remain compile-time errors.
export type SfSymbolName = SFSymbol | SfSymbolCatalogAddition

// SwiftUI's nine font weights, which is what sizes a symbol's stroke through
// One's swiftStyle. One resolves them case-insensitively to Font.Weight and
// fails loudly on anything else, so the union stays closed here.
export type SfSymbolFontWeight =
  | 'ultraLight'
  | 'thin'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'black'

// color takes a theme token or a color already resolved for a plain react
// native color prop. `string & {}` widens to any color string without
// collapsing the token union, so token names still autocomplete. color is the
// icon's only brush: an icon paints its outline from it, so a raw fill or
// stroke would replace that brush with an unresolved token or transparent.
export type IconProps = Omit<SvgProps, 'color' | 'fill' | 'stroke'> & {
  size?: number | SizeTokens
  color?: ColorTokens | (string & {}) | Exclude<ColorValue, string>
}

// a slot takes the component rather than a rendered element so the slot, not
// the caller, picks size and color.
export type IconComponent = ComponentType<IconProps>

// the slot an app's icon set fills. narrower than IconProps on purpose: a slot
// that promised SvgProps could never be filled by a native symbol, and size and
// sfSymbol all satisfy it, which is what lets icons/index.ios.ts override
// entries from icons/base.ts.
export type Icon = ComponentType<{ size?: number; color?: string }>

// an sfSymbol icon also names its symbol, so a native surface that takes a
// symbol name rather than a view, such as a system menu item, reads the name
// without rendering the component.
export type SfSymbolIcon = Icon & { systemName: SfSymbolName }
