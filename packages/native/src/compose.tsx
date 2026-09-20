import type {
  ComposeAlertDialogProps,
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeColumnProps,
  ComposeDialogProps,
  ComposeIconProps,
  ComposeProgressIndicatorProps,
  ComposeRowProps,
  ComposeSliderProps,
  ComposeSwitchProps,
  ComposeTextFieldProps,
  ComposeTextProps,
} from './composeTypes'

function unsupported(name: string): never {
  throw new Error(
    `Compose.${name} requires an Android native build with @vxrn/native installed`
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
  Text,
  Icon,
  Button,
  Switch,
  TextField,
  Slider,
  AlertDialog,
  Dialog,
  ProgressIndicator,
}
