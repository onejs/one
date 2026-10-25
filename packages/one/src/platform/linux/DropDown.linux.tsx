import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativeDropDown, { type ChangeEvent } from './OneLinuxDropDownNativeComponent'

export type DropDownProps = Omit<ViewProps, 'children'> & {
  labels: readonly string[]
  selectedIndex: number
  disabled?: boolean
  revision?: number
  onChange?: (event: { selectedIndex: number; revision: number }) => void
}

export function DropDown({
  labels,
  selectedIndex,
  revision = 0,
  onChange,
  style,
  ...props
}: DropDownProps) {
  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < -1 ||
    selectedIndex >= labels.length
  ) {
    throw new Error('DropDown selectedIndex must be -1 or an index in labels')
  }
  const controlled = useControlled((event: ChangeEvent) => {
    onChange?.({ selectedIndex: event.value, revision: event.revision })
  }, revision)
  return (
    <NativeDropDown
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
