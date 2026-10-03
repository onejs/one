// the form pattern, one entry point, two legs chosen by platform extension.
//
// `./FormImpl` resolves to FormImpl.ios.tsx on ios and FormImpl.tsx
// everywhere else: android has no Compose leg yet, so it takes the Tamagui
// leg rather than the SwiftUI one, whose One.iOS calls throw outside an iOS
// native build.
//
// the exports map still never points at a file with a platform sibling: it
// names Form.tsx, which has none, and the split happens one relative hop
// later. getting it wrong is silent - apps render the web leg on a device
// and every screenshot still looks plausible.
export * from './FormImpl'
export type {
  FieldProps,
  FormPresentation,
  FormProps,
  NavigationRowProps,
  SectionProps,
  SegmentedFieldProps,
  SegmentedOption,
  SubmitButtonProps,
  ToggleFieldProps,
  ValueFieldProps,
} from './formContract'
