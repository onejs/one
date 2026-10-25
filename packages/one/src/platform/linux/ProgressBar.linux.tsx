import type { ViewProps } from 'react-native'
import NativeProgressBar from './OneLinuxProgressBarNativeComponent'

export type ProgressBarProps = Omit<ViewProps, 'children'> & {
  value?: number
  indeterminate?: boolean
}

export function ProgressBar({ value, indeterminate = value === undefined, style, ...props }: ProgressBarProps) {
  if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error('ProgressBar value must be between 0 and 1')
  }
  return (
    <NativeProgressBar
      {...props}
      value={value ?? 0}
      indeterminate={indeterminate}
      style={style}
    />
  )
}
