import type { ViewProps } from 'react-native'
import { useControlled } from '../controlled'
import NativePopUpButton, { type ChangeEvent } from './OneMacPopUpButtonNativeComponent'

export type PopUpButtonProps = Omit<ViewProps, 'children'> & {
  labels: readonly string[]
  /** zero based selection, or -1 for no selection. */
  selectedIndex: number
  disabled?: boolean
  revision?: number
  onChange?: (event: { selectedIndex: number; revision: number }) => void
}

export function PopUpButton({ labels, selectedIndex, revision = 0, onChange, ...props }: PopUpButtonProps) {
  if (!Number.isInteger(selectedIndex) || selectedIndex < -1 || selectedIndex >= labels.length) {
    throw new Error('PopUpButton selectedIndex must be -1 or an index in labels')
  }
  const controlled = useControlled((event: ChangeEvent) => {
    onChange?.({ selectedIndex: event.selectedIndex, revision: event.revision })
  }, revision)
  return (
    <NativePopUpButton
      {...props}
      labels={labels}
      selectedIndex={selectedIndex}
      revision={controlled.revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      onSelectedIndexChange={(event) => controlled.onNativeChange(event.nativeEvent)}
    />
  )
}
