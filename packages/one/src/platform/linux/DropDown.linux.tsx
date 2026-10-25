import type { ControlledControlProps, ControlChange, NumericControlChange } from '../controlTypes'
import { useControlled } from '../controlled'
import NativeDropDown, { type SelectionEvent } from './OneLinuxDropDownNativeComponent'

export type DropDownItem = Readonly<{ label: string; value: string }>
export type DropDownProps = ControlledControlProps & ({
  labels: readonly string[]
  selectedIndex: number
  onChange?: (event: ControlChange<{ selectedIndex: number }>) => void
  items?: never
  selection?: never
  onSelectionChange?: never
} | {
  items: readonly DropDownItem[]
  selection: string | null
  onSelectionChange?: (event: ControlChange<{ selection: string | null }>) => void
  labels?: never
  selectedIndex?: never
  onChange?: never
})

export function DropDown({ labels, selectedIndex, onChange, items, selection, onSelectionChange,
  revision = 0, style, ...props }: DropDownProps) {
  const nativeLabels = items === undefined ? labels! : items.map((item) => item.label)
  const index = items === undefined ? selectedIndex! : selection === null ? -1 : items.findIndex((item) => item.value === selection)
  if (items !== undefined) {
    if (new Set(items.map((item) => item.value)).size !== items.length) {
      throw new Error('DropDown item values must be unique')
    }
    if (selection !== null && index < 0) {
      throw new Error('DropDown selection must be null or an item value')
    }
  }
  if (!Number.isInteger(index) || index < -1 || index >= nativeLabels.length) {
    throw new Error('DropDown selectedIndex must be -1 or an index in labels')
  }
  const controlled = useControlled((event: NumericControlChange | SelectionEvent) => {
    if ('hasSelection' in event) {
      onSelectionChange?.({ selection: event.hasSelection ? event.selection : null, revision: event.revision })
    } else {
      onChange?.({ selectedIndex: event.value, revision: event.revision })
    }
  }, revision)
  return <NativeDropDown {...props} labels={nativeLabels} value={index}
    itemValues={items === undefined ? [] : items.map((item) => item.value)}
    tagged={items !== undefined} selection={selection ?? ''} hasSelection={items !== undefined && selection !== null}
    style={style} revision={controlled.revision} acknowledgedEvent={controlled.acknowledgedEvent}
    onControlChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)}
    onSelectionChange={({ nativeEvent }) => controlled.onNativeChange(nativeEvent)} />
}
