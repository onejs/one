import type { ReactElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

export interface Entry {
  id: string
  title: string
  notes: string
  done: boolean
}

type Props<T> = T & { style?: StyleProp<ViewStyle> }
const none = (): ReactElement | null => null

// the native screens exist on iOS and Android only
export const EntryList = none as (
  props: Props<{
    entries: Entry[]
    onSelect: (id: string) => void
    onAdd: () => void
    onSort: () => void
  }>
) => ReactElement | null
export const EntryDetail = none as (
  props: Props<{
    entry: Entry
    onChange: (entry: Entry) => void
    onBack?: () => void
  }>
) => ReactElement | null
export const SortSheet = none as (
  props: Props<{
    order: string
    onSelect: (order: string) => void
    onClose: () => void
  }>
) => ReactElement | null
export const EntryForm = none as (
  props: Props<{
    onSubmit: (title: string, notes: string) => void
    onCancel: () => void
  }>
) => ReactElement | null
