import type { StyleProp, ViewStyle } from 'react-native'
import type { SDKSiriTipViewStyle } from '../generated/types'

export type SiriTipViewProps = {
  phrase?: string
  intentId?: string
  visible?: boolean
  style?: StyleProp<ViewStyle>
  siriTipViewStyle?: SDKSiriTipViewStyle
  onDismiss?: () => void
}
