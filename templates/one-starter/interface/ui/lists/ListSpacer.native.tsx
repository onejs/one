import { View } from 'react-native'
import type { ListSpacerProps } from './virtualListContract'

export function ListSpacer({ height }: ListSpacerProps) {
  return <View style={{ height }} />
}
