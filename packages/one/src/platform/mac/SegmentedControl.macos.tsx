import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeSegmentedControl, { type ChangeEvent } from './OneMacSegmentedControlNativeComponent'

export type SegmentedControlProps = Omit<ViewProps, 'children'> & {
  labels: readonly string[]
  /** zero based selection, or -1 for no selection. */
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
  ...props
}: SegmentedControlProps) {
  if (!Number.isInteger(selectedIndex) || selectedIndex < -1 || selectedIndex >= labels.length) {
    throw new Error('SegmentedControl selectedIndex must be -1 or an index in labels')
  }
  const controlled = useControlled((event: ChangeEvent) => {
    onChange?.({ selectedIndex: event.selectedIndex, revision: event.revision })
  }, revision)
  return (
    <NativeSegmentedControl
      {...props}
      labels={labels}
      selectedIndex={selectedIndex}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onSelectedIndexChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
