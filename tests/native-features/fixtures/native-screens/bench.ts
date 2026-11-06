import type { ReactElement } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

export const BenchList = (_props: {
  rows: { id: number; title: string; value: number; flag: boolean }[]
  tick: number
  onApplied: (tick: number) => void
  style?: StyleProp<ViewStyle>
}): ReactElement | null => null
