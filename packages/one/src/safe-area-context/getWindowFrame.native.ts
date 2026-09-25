import { Dimensions } from 'react-native'
import type { Rect } from './SafeArea-types'

export function getWindowFrame(): Rect {
  const { width, height } = Dimensions.get('window')
  return { x: 0, y: 0, width, height }
}
