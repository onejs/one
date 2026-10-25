import type { ControlledControlProps, ControlChange, NumericControlChange } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeSegmentedControl from './OneLinuxSegmentedControlNativeComponent'

export type SegmentedControlProps = ControlledControlProps & {
  labels: readonly string[]
  selectedIndex: number
  onChange?: (event: ControlChange<{ selectedIndex: number }>) => void
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
  const controlled = useControlled((event: NumericControlChange) => {
    onChange?.({ selectedIndex: event.value, revision: event.revision })
  }, revision)
  return (
    <NativeSegmentedControl
      {...props}
      labels={labels}
      value={selectedIndex}
      style={style}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onControlChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
