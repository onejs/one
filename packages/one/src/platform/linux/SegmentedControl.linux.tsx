import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeSegmentedControl, {
  type ChangeEvent,
} from './OneLinuxSegmentedControlNativeComponent'

export type SegmentedControlProps = Omit<ViewProps, 'children'> & {
  labels: readonly string[]
  selectedIndex: number
  disabled?: boolean
  revision?: number
  onChange?: (event: { selectedIndex: number; revision: number }) => void
}

export function SegmentedControl({
  labels,
  selectedIndex,
  revision = 0,
  onChange,
  style,
  ...props
}: SegmentedControlProps) {
  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < -1 ||
    selectedIndex >= labels.length
  ) {
    throw new Error('SegmentedControl selectedIndex must be -1 or an index in labels')
  }
  const controlled = useControlled((event: ChangeEvent) => {
    onChange?.({ selectedIndex: event.value, revision: event.revision })
  }, revision)
  return (
    <NativeSegmentedControl
      {...props}
      labels={labels}
      value={selectedIndex}
      style={[{ width: 320, height: 34 }, style]}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
