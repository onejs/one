import type { ReactNode } from 'react'
import type {
  ComposeAlertDialogProps,
  ComposeAssistChipProps,
  ComposeBadgeProps,
  ComposeBadgedBoxProps,
  ComposeListItemProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeCardProps,
  ComposeCheckboxProps,
  ComposeColumnProps,
  ComposeContainedLoadingIndicatorProps,
  ComposeDialogProps,
  ComposeDividerProps,
  ComposeElevatedCardProps,
  ComposeExtendedFloatingActionButtonProps,
  ComposeFilterChipProps,
  ComposeFlowRowProps,
  ComposeFloatingActionButtonProps,
  ComposeIconProps,
  ComposeIconButtonProps,
  ComposeInputChipProps,
  ComposeLoadingIndicatorProps,
  ComposeOutlinedCardProps,
  ComposeProgressIndicatorProps,
  ComposeRadioButtonProps,
  ComposeRowProps,
  ComposeSpacerProps,
  ComposeSegmentedButtonProps,
  ComposeSegmentedButtonRowProps,
  ComposeSliderProps,
  ComposeSuggestionChipProps,
  ComposeSurfaceProps,
  ComposeSwitchProps,
  ComposeTextFieldProps,
  ComposeTextProps,
  ComposeToggleButtonProps,
} from './composeTypes'

function unsupported(name: string): never {
  throw new Error(
    `Compose.${name} requires an Android native build`
  )
}

function Column(_props: ComposeColumnProps): never {
  return unsupported('Column')
}

function Row(_props: ComposeRowProps): never {
  return unsupported('Row')
}

function Spacer(_props: ComposeSpacerProps): never {
  return unsupported('Spacer')
}

function FlowRow(_props: ComposeFlowRowProps): never {
  return unsupported('FlowRow')
}

function Box(_props: ComposeBoxProps): never {
  return unsupported('Box')
}

function Badge(_props: ComposeBadgeProps): never {
  return unsupported('Badge')
}

function BadgedBoxRoot(_props: ComposeBadgedBoxProps): never {
  return unsupported('BadgedBox')
}

const BadgedBox = Object.assign(BadgedBoxRoot, {
  Badge: (_props: { children: ReactNode }): never => unsupported('BadgedBox.Badge'),
})

function ListItemRoot(_props: ComposeListItemProps): never {
  return unsupported('ListItem')
}

const ListItem = Object.assign(ListItemRoot, {
  HeadlineContent: (_props: { children: ReactNode }): never => unsupported('ListItem.HeadlineContent'),
  OverlineContent: (_props: { children: ReactNode }): never => unsupported('ListItem.OverlineContent'),
  SupportingContent: (_props: { children: ReactNode }): never => unsupported('ListItem.SupportingContent'),
  LeadingContent: (_props: { children: ReactNode }): never => unsupported('ListItem.LeadingContent'),
  TrailingContent: (_props: { children: ReactNode }): never => unsupported('ListItem.TrailingContent'),
})

function Card(_props: ComposeCardProps): never {
  return unsupported('Card')
}

function ElevatedCard(_props: ComposeElevatedCardProps): never {
  return unsupported('ElevatedCard')
}

function OutlinedCard(_props: ComposeOutlinedCardProps): never {
  return unsupported('OutlinedCard')
}

function Surface(_props: ComposeSurfaceProps): never {
  return unsupported('Surface')
}

function HorizontalDivider(_props: ComposeDividerProps): never {
  return unsupported('HorizontalDivider')
}

function VerticalDivider(_props: ComposeDividerProps): never {
  return unsupported('VerticalDivider')
}

function FilterChipRoot(_props: ComposeFilterChipProps): never {
  return unsupported('FilterChip')
}

function AssistChipRoot(_props: ComposeAssistChipProps): never {
  return unsupported('AssistChip')
}

function InputChipRoot(_props: ComposeInputChipProps): never {
  return unsupported('InputChip')
}

function SuggestionChipRoot(_props: ComposeSuggestionChipProps): never {
  return unsupported('SuggestionChip')
}

const ChipLabel = (_props: { children: ReactNode }): never => unsupported('Chip.Label')
const ChipLeadingIcon = (_props: { children: ReactNode }): never => unsupported('Chip.LeadingIcon')
const ChipTrailingIcon = (_props: { children: ReactNode }): never => unsupported('Chip.TrailingIcon')
const ChipAvatar = (_props: { children: ReactNode }): never => unsupported('Chip.Avatar')
const ChipIcon = (_props: { children: ReactNode }): never => unsupported('Chip.Icon')

const AssistChip = Object.assign(AssistChipRoot, {
  Label: ChipLabel,
  LeadingIcon: ChipLeadingIcon,
  TrailingIcon: ChipTrailingIcon,
})
const FilterChip = Object.assign(FilterChipRoot, {
  Label: ChipLabel,
  LeadingIcon: ChipLeadingIcon,
  TrailingIcon: ChipTrailingIcon,
})
const InputChip = Object.assign(InputChipRoot, {
  Label: ChipLabel,
  Avatar: ChipAvatar,
  TrailingIcon: ChipTrailingIcon,
})
const SuggestionChip = Object.assign(SuggestionChipRoot, {
  Label: ChipLabel,
  Icon: ChipIcon,
})

function Text(_props: ComposeTextProps): never {
  return unsupported('Text')
}

function Icon(_props: ComposeIconProps): never {
  return unsupported('Icon')
}

function Button(_props: ComposeButtonProps): never {
  return unsupported('Button')
}

function IconButton(_props: ComposeIconButtonProps): never {
  return unsupported('IconButton')
}

function FilledIconButton(_props: ComposeIconButtonProps): never {
  return unsupported('FilledIconButton')
}

function FilledTonalIconButton(_props: ComposeIconButtonProps): never {
  return unsupported('FilledTonalIconButton')
}

function OutlinedIconButton(_props: ComposeIconButtonProps): never {
  return unsupported('OutlinedIconButton')
}

const FloatingActionButton = Object.assign((_props: ComposeFloatingActionButtonProps): never => unsupported('FloatingActionButton'), {
  Icon: (_props: { children: ReactNode }): never => unsupported('FloatingActionButton.Icon'),
})
const SmallFloatingActionButton = Object.assign((_props: ComposeFloatingActionButtonProps): never => unsupported('SmallFloatingActionButton'), {
  Icon: (_props: { children: ReactNode }): never => unsupported('SmallFloatingActionButton.Icon'),
})
const LargeFloatingActionButton = Object.assign((_props: ComposeFloatingActionButtonProps): never => unsupported('LargeFloatingActionButton'), {
  Icon: (_props: { children: ReactNode }): never => unsupported('LargeFloatingActionButton.Icon'),
})
const ExtendedFloatingActionButton = Object.assign((_props: ComposeExtendedFloatingActionButtonProps): never => unsupported('ExtendedFloatingActionButton'), {
  Icon: (_props: { children: ReactNode }): never => unsupported('ExtendedFloatingActionButton.Icon'),
  Text: (_props: { children: ReactNode }): never => unsupported('ExtendedFloatingActionButton.Text'),
})

function ToggleButton(_props: ComposeToggleButtonProps): never {
  return unsupported('ToggleButton')
}

function IconToggleButton(_props: ComposeToggleButtonProps): never {
  return unsupported('IconToggleButton')
}

function FilledIconToggleButton(_props: ComposeToggleButtonProps): never {
  return unsupported('FilledIconToggleButton')
}

function OutlinedIconToggleButton(_props: ComposeToggleButtonProps): never {
  return unsupported('OutlinedIconToggleButton')
}

function SingleChoiceSegmentedButtonRow(_props: ComposeSegmentedButtonRowProps): never {
  return unsupported('SingleChoiceSegmentedButtonRow')
}

function MultiChoiceSegmentedButtonRow(_props: ComposeSegmentedButtonRowProps): never {
  return unsupported('MultiChoiceSegmentedButtonRow')
}

function SegmentedButton(_props: ComposeSegmentedButtonProps): never {
  return unsupported('SegmentedButton')
}

function Switch(_props: ComposeSwitchProps): never {
  return unsupported('Switch')
}

function Checkbox(_props: ComposeCheckboxProps): never {
  return unsupported('Checkbox')
}

function RadioButton(_props: ComposeRadioButtonProps): never {
  return unsupported('RadioButton')
}

function TextField(_props: ComposeTextFieldProps): never {
  return unsupported('TextField')
}

function Slider(_props: ComposeSliderProps): never {
  return unsupported('Slider')
}

function AlertDialog(_props: ComposeAlertDialogProps): never {
  return unsupported('AlertDialog')
}

function Dialog(_props: ComposeDialogProps): never {
  return unsupported('Dialog')
}

function ProgressIndicator(_props: ComposeProgressIndicatorProps): never {
  return unsupported('ProgressIndicator')
}

type ProgressVariantProps = Omit<ComposeProgressIndicatorProps, 'variant'>

function LinearProgressIndicator(_props: ProgressVariantProps): never {
  return unsupported('LinearProgressIndicator')
}

function CircularProgressIndicator(_props: ProgressVariantProps): never {
  return unsupported('CircularProgressIndicator')
}

function LinearWavyProgressIndicator(_props: ProgressVariantProps): never {
  return unsupported('LinearWavyProgressIndicator')
}

function CircularWavyProgressIndicator(_props: ProgressVariantProps): never {
  return unsupported('CircularWavyProgressIndicator')
}

function LoadingIndicator(_props: ComposeLoadingIndicatorProps): never {
  return unsupported('LoadingIndicator')
}

function ContainedLoadingIndicator(_props: ComposeContainedLoadingIndicatorProps): never {
  return unsupported('ContainedLoadingIndicator')
}

export const Compose = {
  Column,
  Row,
  Spacer,
  FlowRow,
  Box,
  Badge,
  BadgedBox,
  ListItem,
  Card,
  ElevatedCard,
  OutlinedCard,
  Surface,
  HorizontalDivider,
  VerticalDivider,
  FilterChip,
  AssistChip,
  InputChip,
  SuggestionChip,
  Text,
  Icon,
  Button,
  IconButton,
  FilledIconButton,
  FilledTonalIconButton,
  OutlinedIconButton,
  FloatingActionButton,
  SmallFloatingActionButton,
  LargeFloatingActionButton,
  ExtendedFloatingActionButton,
  ToggleButton,
  IconToggleButton,
  FilledIconToggleButton,
  OutlinedIconToggleButton,
  SingleChoiceSegmentedButtonRow,
  MultiChoiceSegmentedButtonRow,
  SegmentedButton,
  Switch,
  Checkbox,
  RadioButton,
  TextField,
  Slider,
  AlertDialog,
  Dialog,
  ProgressIndicator,
  LinearProgressIndicator,
  CircularProgressIndicator,
  LinearWavyProgressIndicator,
  CircularWavyProgressIndicator,
  LoadingIndicator,
  ContainedLoadingIndicator,
}
