import type {
  ComposeBoxProps,
  ComposeButtonProps,
  ComposeColumnProps,
  ComposeRowProps,
  ComposeSwitchProps,
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

function Button(_props: ComposeButtonProps): never {
  return unsupported('Button')
}

function Switch(_props: ComposeSwitchProps): never {
  return unsupported('Switch')
}

export const Compose = { Column, Row, Box, Text, Button, Switch }
