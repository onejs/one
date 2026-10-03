import { One } from 'one'
import type {
  FieldProps,
  FormProps,
  SectionProps,
  NavigationRowProps,
  SegmentedFieldProps,
  SubmitButtonProps,
  ToggleFieldProps,
  ValueFieldProps,
} from './formContract'
import type { ComponentProps } from 'react'

type TextFieldProps = ComponentProps<typeof One.iOS.TextField>
type KeyboardType = TextFieldProps['keyboardType']
type TextInputAutocapitalization = TextFieldProps['textInputAutocapitalization']

// the native leg: SwiftUI's own Form, which is what iOS uses for every settings
// and entry screen it ships. the web leg's centred card column is a reasonable
// web form and a poor iOS one, and no amount of styling closes that gap because
// grouped inset rows, their separators, their keyboard handling and their
// scroll behaviour are the platform's, not ours to redraw.

// ONE Form, at the form root, and this is the whole reason the shared pattern is
// form-level rather than field-level. a SwiftUI subtree lives inside a Form that
// owns the grouped rows, and a lone TextField outside one gets none of the
// grouped row treatment that made switching worthwhile. there is no Host here:
// a Form cannot be a child of one, and One's leaves compose into their parent
// without it.
//
// this used to cite examples/game-pet's settings screen as the shape it
// follows. that screen is now a consumer of this file, so the citation would be
// circular: what it follows is SwiftUI's own Form, one Form at the root.
export function Form({ children, testID }: FormProps) {
  // the native Form fills whatever box it is given and scrolls itself; there
  // is no content sizing, so this never sits inside a scroll view (it would
  // measure zero height and paint nothing). the sheet frame gives it the
  // middle box between its header and its action; a screen gives it the page.
  // the presentation prop still shapes the Tamagui leg, and is ignored here.
  return <One.iOS.Form testID={testID}>{children}</One.iOS.Form>
}

export function Section({ title, footer, children }: SectionProps) {
  // plain is a web-only flattening and is ignored here: the native section
  // is always SwiftUI's grouped rows, dialog or page alike.
  return (
    <One.iOS.Section title={title ?? ''} footer={footer ?? ''}>
      {children}
    </One.iOS.Section>
  )
}

// SwiftUI's capitalisation cases. react native spells the off case 'none' and
// SwiftUI spells it 'never'; the rest carry the same names.
const AUTOCAPITALIZE_TO_ONE: Record<
  NonNullable<FieldProps['autoCapitalize']>,
  TextInputAutocapitalization
> = {
  none: 'never',
  sentences: 'sentences',
  words: 'words',
  characters: 'characters',
}

// the contract spells keyboards the way react native does and One spells them
// the way SwiftUI does, so each member maps to its camelCase twin. numeric has
// no SwiftUI twin of its own and reaches numberPad, which is the same keyboard
// the expo leg showed for it, measured in its KeyboardTypeModifier.
const KEYBOARD_TYPE_TO_ONE: Record<
  NonNullable<FieldProps['keyboardType']>,
  KeyboardType
> = {
  default: 'default',
  'email-address': 'emailAddress',
  numeric: 'numberPad',
  'decimal-pad': 'decimalPad',
  'phone-pad': 'phonePad',
  url: 'url',
  'ascii-capable': 'asciiCapable',
  'numbers-and-punctuation': 'numbersAndPunctuation',
  'name-phone-pad': 'namePhonePad',
  twitter: 'twitter',
  'web-search': 'webSearch',
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  multiline,
  autoCapitalize,
  keyboardType,
  testID,
}: FieldProps) {
  // One's fields are controlled: the text prop drives native and every
  // keystroke reports through onTextChange, so a value that arrives late (a
  // signed-in user loading, a record fetched) lands on its own. there is no
  // ObservableState to bind and no echo to guard against.
  //
  // the label is the row's LabeledContent and the prompt is the field's
  // placeholder. SwiftUI shows a TextField's title only while no prompt is
  // set, so a title-carried label vanishes the moment a placeholder arrives
  // (and while typing even without one). a settings row keeps its label, so
  // the label lives on the row and the field carries an empty title.
  const textInputAutocapitalization =
    autoCapitalize === undefined ? undefined : AUTOCAPITALIZE_TO_ONE[autoCapitalize]
  const oneKeyboardType =
    keyboardType === undefined ? undefined : KEYBOARD_TYPE_TO_ONE[keyboardType]

  const control = secure ? (
    <One.iOS.SecureField
      text={value}
      onTextChange={onChangeText}
      label=""
      prompt={placeholder ?? ''}
      keyboardType={oneKeyboardType}
      textInputAutocapitalization={textInputAutocapitalization}
      testID={testID}
    />
  ) : (
    <One.iOS.TextField
      text={value}
      onTextChange={onChangeText}
      label=""
      prompt={placeholder ?? ''}
      // SwiftUI's own multiline: a TextField that grows along the vertical
      // axis. there is no separate multiline control to reach for here.
      axis={multiline ? 'vertical' : 'horizontal'}
      keyboardType={oneKeyboardType}
      textInputAutocapitalization={textInputAutocapitalization}
      testID={testID}
    />
  )
  return <One.iOS.LabeledContent label={label}>{control}</One.iOS.LabeledContent>
}

export function ValueField({ label, value, testID }: ValueFieldProps) {
  // SwiftUI's LabeledContent, whose value prop takes the trailing value. the
  // row's leading/trailing layout and its secondary value colour are the
  // platform's.
  return <One.iOS.LabeledContent label={label} value={value} testID={testID} />
}

export function NavigationRow({
  label,
  subtitle,
  systemImage,
  onPress,
  testID,
}: NavigationRowProps) {
  // a Button inside a SwiftUI Form IS the settings navigation row: full width,
  // grouped-inset, tinted label, leading SF Symbol when one is given. this is
  // the shape app-travel and app-finance already hand-wrote at their call
  // sites, lifted here rather than redesigned. a subtitle is One's own second
  // line under the label, in the platform's secondary style, composed with the
  // symbol rather than replacing it.
  //
  // it carries NO disclosure chevron, and that is the contract staying narrower
  // than the platform rather than something missing. One's Button draws that
  // chevron for disclosureIndicator, which the contract does not expose;
  // building the chevron by hand, as an HStack of Text, Spacer and a
  // chevron.right Image inside the Button, would draw the glyph without the row
  // semantics SwiftUI attaches to a real link, which is the lookalike this
  // pattern exists to delete.
  return (
    <One.iOS.Button
      label={label}
      subtitle={subtitle ?? ''}
      systemImage={systemImage ?? ''}
      onPress={onPress}
      testID={testID}
    />
  )
}

export function SegmentedField<T extends string>({
  value,
  options,
  onChange,
  testID,
}: SegmentedFieldProps<T>) {
  // One's Picker takes its options as data and draws the segments itself under
  // `.segmented`, filling its form row the way Settings does without a frame
  // from the call site. the selection it reports is always one of the option
  // values, so the lookup below only ever narrows the string back to T.
  return (
    <One.iOS.Picker
      selection={value}
      onSelectionChange={(selection) => {
        const match = options.find((option) => option.value === selection)
        if (!match) throw new Error('Picker reported a value outside its options')
        onChange(match.value)
      }}
      options={options}
      pickerStyle="segmented"
      testID={testID}
    />
  )
}

export function ToggleField({ label, value, onValueChange, testID }: ToggleFieldProps) {
  // SwiftUI's Toggle owns the whole row, label included, so the label is a prop
  // rather than a sibling view. laying one out by hand beside it would be the
  // lookalike this pattern exists to delete.
  return (
    <One.iOS.Toggle
      isOn={value}
      onIsOnChange={onValueChange}
      label={label}
      testID={testID}
    />
  )
}

export function SubmitButton({
  label,
  onPress,
  disabled,
  destructive,
  testID,
}: SubmitButtonProps) {
  // One's Button takes disabled and the destructive role as props, which is
  // SwiftUI's own `.disabled(_:)` and `role: .destructive` rather than an
  // invented treatment.
  return (
    <One.iOS.Button
      label={label}
      onPress={onPress}
      disabled={disabled ?? false}
      buttonRole={destructive ? 'destructive' : ''}
      testID={testID}
    />
  )
}
