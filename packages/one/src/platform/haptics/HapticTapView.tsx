import { View } from 'react-native'
import type { HapticTapProps } from './types'
import { assertImpact } from './validation'

export function HapticTap({ feedback = 'selection', ...props }: HapticTapProps) {
  if (feedback !== 'selection') assertImpact(feedback)
  return <View {...props} />
}
