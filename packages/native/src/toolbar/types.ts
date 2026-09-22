import type { ColorValue, ImageSourcePropType, TextStyle } from 'react-native'

export interface BasicTextStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: TextStyle['fontWeight']
  color?: ColorValue
}

export interface ToolbarHostProps {
  children?: React.ReactNode
  /**
   * Hides the navigation controller toolbar. Toggled with animation when
   * animated is true.
   */
  hidden?: boolean
  /**
   * Animate toolbar show/hide. Defaults to true.
   */
  animated?: boolean
}

export interface ToolbarItemProps {
  children?: React.ReactNode
  identifier: string
  title?: string
  systemImageName?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
  type?: 'normal' | 'fixedSpacer' | 'fluidSpacer' | 'searchBar'
  tintColor?: ColorValue
  hidesSharedBackground?: boolean
  sharesBackground?: boolean
  barButtonItemStyle?: 'plain' | 'done' | 'prominent'
  width?: number
  hidden?: boolean
  selected?: boolean
  badgeConfiguration?: {
    value?: string
    backgroundColor?: ColorValue
  } & BasicTextStyle
  titleStyle?: BasicTextStyle
  accessibilityLabel?: string
  accessibilityHint?: string
  disabled?: boolean
  onSelected?: () => void
}
