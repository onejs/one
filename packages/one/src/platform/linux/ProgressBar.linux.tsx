import type { ControlViewProps } from '../controlTypes'
import NativeProgressBar from './OneLinuxProgressBarNativeComponent'

export type ProgressBarProps = ControlViewProps & {
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
