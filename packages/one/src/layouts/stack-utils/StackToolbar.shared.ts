import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

import type {
  StackToolbarConfig,
  StackToolbarPlacement,
  StackToolbarProps,
} from './StackToolbar.types'

const optionKeys = {
  left: '__oneStackToolbarLeft',
  right: '__oneStackToolbarRight',
  bottom: '__oneStackToolbarBottom',
} as const satisfies Record<StackToolbarPlacement, string>

export function appendStackToolbarConfig(
  options: NativeStackNavigationOptions,
  props: StackToolbarProps
): NativeStackNavigationOptions {
  return {
    ...options,
    [optionKeys[props.placement ?? 'bottom']]: props,
  }
}

export function exposeStackToolbarConfig(
  options: Record<string, any>
): Record<string, any> {
  const toolbar: StackToolbarConfig = {
    left: options[optionKeys.left],
    right: options[optionKeys.right],
    bottom: options[optionKeys.bottom],
  }

  if (!toolbar.left && !toolbar.right && !toolbar.bottom) return options

  const {
    [optionKeys.left]: _left,
    [optionKeys.right]: _right,
    [optionKeys.bottom]: _bottom,
    ...publicOptions
  } = options

  return { ...publicOptions, toolbar }
}
