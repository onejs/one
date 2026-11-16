import type Arrow from './Arrow'
import type Button from './Button'
import type { KeyboardStickyViewProps } from '../KeyboardStickyView'
import type { ReactNode } from 'react'
import type { ColorValue, GestureResponderEvent, ViewProps } from 'react-native'

type Theme = {
  /** Color for arrow when it's enabled. */
  primary: ColorValue
  /** Color for arrow when it's disabled. */
  disabled: ColorValue
  /** Keyboard toolbar background color. */
  background: string
  /** Color for ripple effect (on button touch) on Android. */
  ripple: ColorValue
}
export type KeyboardToolbarTheme = {
  light: Theme
  dark: Theme
}
type HexSymbol =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
export type HEX = `${HexSymbol}${HexSymbol}`

type SafeAreaInsets = {
  left: number
  right: number
}

export type KeyboardToolbarProps = Omit<ViewProps, 'style' | 'testID' | 'children'> & {
  /**
   * An element that is shown in the middle of the toolbar.
   *
   * @deprecated Use compound API with `<KeyboardToolbar.Content />` component instead.
   */
  content?: React.JSX.Element | null
  /** A set of dark/light colors consumed by toolbar component. */
  theme?: KeyboardToolbarTheme
  /**
   * Custom text for done button.
   *
   * @deprecated Use compound API with `<KeyboardToolbar.Done />` component and `text` prop instead.
   */
  doneText?: ReactNode
  /**
   * Custom touchable component for toolbar (used for prev/next/done buttons).
   *
   * @deprecated Use `button` property for corresponding element instead:
   * ```tsx
   * <KeyboardToolbar>
   *   <KeyboardToolbar.Prev button={MyCustomButton} />
   * </KeyboardToolbar>
   * ```.
   */
  button?: typeof Button
  /**
   * Custom icon component used to display next/prev buttons.
   *
   * @deprecated Use `icon` property for corresponding element instead:
   * ```tsx
   * <KeyboardToolbar>
   *   <KeyboardToolbar.Prev icon={MyCustomIcon} />
   * </KeyboardToolbar>
   * ```.
   */
  icon?: typeof Arrow
  /**
   * Whether to show next and previous buttons. Can be useful to set it to `false` if you have only one input
   * and want to show only `Done` button. Default to `true`.
   *
   * @deprecated Use compound API and conditional rendering for `<KeyboardToolbar.Next />` and `<KeyboardToolbar.Prev />`.
   */
  showArrows?: boolean
  /**
   * A callback that is called when the user presses the next button along with the default action.
   *
   * @deprecated Use compound API with `<KeyboardToolbar.Next />` and `onPress` callback instead.
   */
  onNextCallback?: (event: GestureResponderEvent) => void
  /**
   * A callback that is called when the user presses the previous button along with the default action.
   *
   * @deprecated Use compound API with `<KeyboardToolbar.Prev />` and `onPress` callback instead.
   */
  onPrevCallback?: (event: GestureResponderEvent) => void
  /**
   * A callback that is called when the user presses the done button along with the default action.
   *
   * @deprecated Use compound API with `<KeyboardToolbar.Done />` and `onPress` callback instead.
   */
  onDoneCallback?: (event: GestureResponderEvent) => void
  /**
   * A component that applies blur effect to the toolbar.
   *
   * @deprecated Use compound API and `<KeyboardToolbar.Effect />` instead.
   */
  blur?: React.JSX.Element | null
  /**
   * A value for container opacity in hexadecimal format (e.g. `ff`). Default value is `ff`.
   */
  opacity?: HEX
  /**
   * A object containing `left`/`right` properties. Used to specify proper container padding in landscape mode.
   */
  insets?: SafeAreaInsets
  /** JSX children in case if compound API is used. */
  children?: ReactNode
} & Pick<KeyboardStickyViewProps, 'offset' | 'enabled'>
