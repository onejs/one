import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeProgressBar, { type ChangeEvent } from './OneLinuxProgressBarNativeComponent'

export type ProgressBarProps = Omit<ViewProps, 'children'> & {
  value: number
  revision?: number
}

export function ProgressBar({ value, revision = 0, style, ...props }: ProgressBarProps) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('ProgressBar value must be between 0 and 1')
  }
  const controlled = useControlled((_event: ChangeEvent) => {}, revision)
  return (
    <NativeProgressBar
      {...props}
      value={value}
      style={style}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
    />
  )
}
