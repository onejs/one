import type { ColorValue, ImageSourcePropType } from 'react-native'
import type { BasicTextStyle } from '../toolbar/types'

export interface MenuActionProps {
  identifier: string
  title: string
  label?: string
  icon?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
  children?: React.ReactNode
  disabled?: boolean
  destructive?: boolean
  discoverabilityLabel?: string
  subtitle?: string
  accessibilityLabel?: string
  accessibilityHint?: string
  displayAsPalette?: boolean
  displayInline?: boolean
  preferredElementSize?: 'auto' | 'small' | 'medium' | 'large'
  isOn?: boolean
  keepPresented?: boolean
  hidden?: boolean
  tintColor?: ColorValue
  barButtonItemStyle?: 'plain' | 'prominent'
  sharesBackground?: boolean
  hidesSharedBackground?: boolean
  onSelected?: () => void
  singleSelection?: boolean
  titleStyle?: BasicTextStyle
}
