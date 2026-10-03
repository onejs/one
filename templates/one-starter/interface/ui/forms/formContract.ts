import type { DateOnlyKey } from '../display/dateOnly'
import type { IconComponent, SfSymbolName } from '../icons/types'
import type { ReactNode } from 'react'

// the props both legs implement. structural types live once, in the owning
// contract, so neither leg can drift from the other silently.
//
// the API is deliberately narrow. every prop here has a faithful counterpart in
// both SwiftUI's Form and the tamagui treatment; anything that only one side
// can express does not belong on a shared pattern.

/**
 * how the form is presented, which is the only thing a call site declares. the
 * variant owns its own sizing and scrolling internally and exposes no way to
 * override either, so a screen cannot get the geometry wrong.
 *
 * `screen` is a form that IS the screen: it fills the space it is given and
 * owns its scrolling, the way iOS Settings does.
 *
 * `sheet` is a form block inside a sheet that already owns a scrolling column.
 * it sizes to its content and never scrolls, because the four sheets using it
 * interleave custom UI with form blocks in one column - app-travel's trip/new
 * puts a calendar card between two of them - and a form that scrolled itself
 * could not be a sibling of that content.
 */
export type FormPresentation = 'screen' | 'sheet'

export type FormProps = {
  children: ReactNode
  presentation?: FormPresentation
  testID?: string
}

export type FormSheetBodyProps = {
  children: ReactNode
}

export type FormSheetFrameProps = FormSheetBodyProps & {
  paddingBottom?: number
  // ios fills the navigator's box below a native header instead of taking
  // the largest detent's height. web and android use their sheet container.
  fill?: boolean
  // ios leaves the sheet's liquid glass clear instead of adding material.
  // web and android keep their own sheet surface.
  glass?: boolean
}

export type SectionProps = {
  /** SwiftUI renders this as the section header; web renders it above the card. */
  title?: string
  /** SwiftUI renders this as the section footer; web renders it under the card. */
  footer?: string
  /**
   * fields directly on the surface, no card. dialogs take this: the dialog
   * is already the card, so a card inside it doubles the background and the
   * side padding. page forms keep the card. SwiftUI ignores it: the native
   * section is always the platform's grouped rows.
   */
  plain?: boolean
  children: ReactNode
}

/**
 * one calendar day the user picks, stored as a `YYYY-MM-DD` date-only key
 * from `~/interface/ui/display` dateOnly, never as an instant, so a day stored
 * in one zone reads back as the same day in every zone.
 *
 * the web leg is the browser's own date picker (`<input type="date">`); the
 * native leg is SwiftUI's DatePicker showing date components in the compact
 * form-row style, which opens the system calendar. both legs report the same
 * key through `onChange`.
 */
export type DateFieldProps = {
  label: string
  value: DateOnlyKey
  onChange: (key: DateOnlyKey) => void
  testID?: string
}

export type FieldProps = {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  /** a password field. SwiftUI SecureField, RN secureTextEntry. */
  secure?: boolean
  /**
   * grows vertically past one line. SwiftUI's own `axis="vertical"` on
   * TextField, which is what it does for multiline entry; RN multiline.
   */
  multiline?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  /**
   * the eleven keyboards both legs can ask for, measured rather than recalled:
   * every member has a react native KeyboardTypeOptions spelling and a One
   * `keyboardType` prop twin, with `numeric` reaching One's `numberPad` the way
   * the old expo leg did.
   *
   * three members are deliberately absent. One's `asciiCapableNumberPad` has no
   * react native counterpart, and react native's `visible-password` has no One
   * counterpart (One reaches for SecureField instead), so each is something
   * only one leg can express. react native's `number-pad` does have a One twin
   * now, but `numeric` already maps to that same keyboard, so it stays out:
   * one spelling per keyboard. the contract may be narrower than upstream,
   * never different.
   */
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'decimal-pad'
    | 'phone-pad'
    | 'url'
    | 'ascii-capable'
    | 'numbers-and-punctuation'
    | 'name-phone-pad'
    | 'twitter'
    | 'web-search'
  testID?: string
}

export type ValueFieldProps = {
  label: string
  /**
   * the trailing value, read only. One's LabeledContent value prop, which is
   * the row iOS uses for every piece of information a settings screen shows
   * without letting you edit it.
   */
  value: string
  testID?: string
}

export type NavigationRowProps = {
  label: string
  /**
   * a second, secondary line under the label. iOS ships two list-row shapes for
   * a detail string and they are not interchangeable: a trailing value on the
   * same line, which is `ValueField`, and this one, stacked under the label.
   * pick by where the detail belongs, not by which component is nearer.
   */
  subtitle?: string
  /**
   * the leading glyph, and it is two props because the legs genuinely take
   * different things: SwiftUI names a symbol, the web leg renders a component.
   * neither can express the other, so the contract carries both rather than
   * inventing a mapping between an SF Symbol name and an icon module.
   *
   * the native leg's SF Symbol, kept as the closed symbol union rather than
   * widened to `string`, so a name SwiftUI does not ship fails here.
   */
  systemImage?: SfSymbolName
  /**
   * the web leg's icon component, from `~/interface/ui/icons`.
   *
   * it has NO consumer today and that is expected, not an oversight: every
   * example's web settings screen is bespoke by design (a sidebar with an
   * active state, or a game screen), so none of them renders a web
   * NavigationRow yet. it exists because `systemImage` above DOES have
   * consumers, and a member only one leg can express is what the rule at the
   * top of this file forbids. do not delete it as dead, and do not treat it as
   * load-bearing.
   */
  icon?: IconComponent
  /**
   * what the row does. the contract takes a callback rather than an href so
   * ~/interface/ui stays router-agnostic: the call site owns `router.push`, and
   * this package gains no dependency on a router to express a settings row.
   */
  onPress: () => void
  testID?: string
}

export type SegmentedOption<T extends string = string> = {
  /**
   * what `onChange` reports. the native leg hands the options to One's Picker
   * as data, which is how it identifies a selection.
   */
  value: T
  label: string
}

/**
 * one row of mutually exclusive choices, always laid out as segments.
 *
 * SwiftUI reaches this through Picker, whose `pickerStyle` takes seven styles:
 * automatic, inline, menu, navigationLink, palette, segmented and wheel. Only
 * `segmented` is here, because it is the only one with an honest counterpart on
 * both legs today, and a style neither leg can draw faithfully would be a
 * lookalike rather than the control. `menu` is the one to add next when a screen
 * needs it, since the web leg already has Select; the remaining five have no web
 * counterpart at all and drawing one by hand would invent the platform rather
 * than use it.
 *
 * so this is a component rather than a `style` prop: a union with one member is
 * a fork that does not exist yet.
 *
 * it is generic over the option value so a screen selecting between three
 * named days gets its own union back from `onChange`, rather than a bare
 * string it has to re-narrow.
 */
export type SegmentedFieldProps<T extends string = string> = {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  testID?: string
}

export type ToggleFieldProps = {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
  testID?: string
}

export type SubmitButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  /** a destructive action. SwiftUI's `role="destructive"`, web's red theme. */
  destructive?: boolean
  testID?: string
}
