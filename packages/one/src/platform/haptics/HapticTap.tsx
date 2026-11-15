import { View } from 'react-native'
import type { HapticTapProps } from './types'
import { assertImpact } from './validation'

// web has no haptics (see Haptics in ./index), so this is the plain view
export function HapticTap({ feedback = 'selection', ...props }: HapticTapProps) {
  if (feedback !== 'selection') assertImpact(feedback)
  return <View {...props} />
}
