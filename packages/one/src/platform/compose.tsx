import type { ReactNode } from 'react'
import type {
  ComposeAlertDialogProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeCardProps,
  ComposeCheckboxProps,
  ComposeColumnProps,
  ComposeDialogProps,
  ComposeDividerProps,
  ComposeElevatedCardProps,
  ComposeFilterChipProps,
  ComposeIconProps,
  ComposeOutlinedCardProps,
  ComposeProgressIndicatorProps,
  ComposeRadioButtonProps,
  ComposeRowProps,
  ComposeSliderProps,
  ComposeSwitchProps,
  ComposeTextFieldProps,
  ComposeTextProps,
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

function Box(_props: ComposeBoxProps): never {
  return unsupported('Box')
}

function Card(_props: ComposeCardProps): never {
  return unsupported('Card')
}

function ElevatedCard(_props: ComposeElevatedCardProps): never {
  return unsupported('ElevatedCard')
}

function OutlinedCard(_props: ComposeOutlinedCardProps): never {
  return unsupported('OutlinedCard')
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

const FilterChip = Object.assign(FilterChipRoot, {
  Label: (_props: { children: ReactNode }): never => unsupported('FilterChip.Label'),
  LeadingIcon: (_props: { children: ReactNode }): never => unsupported('FilterChip.LeadingIcon'),
  TrailingIcon: (_props: { children: ReactNode }): never => unsupported('FilterChip.TrailingIcon'),
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

export const Compose = {
  Column,
  Row,
  Box,
  Card,
  ElevatedCard,
  OutlinedCard,
  HorizontalDivider,
  VerticalDivider,
  FilterChip,
  Text,
  Icon,
  Button,
  Switch,
  Checkbox,
  RadioButton,
  TextField,
  Slider,
  AlertDialog,
  Dialog,
  ProgressIndicator,
}
