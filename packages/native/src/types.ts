export type * from './generated/types'
export type * from './generated/controlTypes'
export type * from './generated/sheetTypes'
export type * from './generated/popoverTypes'
export type * from './generated/containerTypes'
export type * from './listTypes'
export type * from './groupTypes'
export type * from './textTypes'
import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { OneNativeStyle } from './generated/controlTypes'
import type {
  AdaptableTabBarPlacement,
  SpringLoadingBehavior,
  TabCustomizationBehavior,
  TabPlacement,
  TabRole,
  TabSectionExpansion,
  TabViewStyle,
  Visibility,
} from './generated/swiftui'
import type { TabViewSlotName } from './generated/viewSlots'

// the TabContent modifiers a Tab and a TabSection share, named and shaped as SwiftUI
// declares them. `for` lists the placements a variadic `for placements:` receives.
export interface TabContentProps {
  disabled?: boolean
  hidden?: boolean
  customizationID?: string
  customizationBehavior?: {
    behavior: TabCustomizationBehavior
    for?: readonly AdaptableTabBarPlacement[]
  }
  defaultVisibility?: {
    visibility: Visibility
    for?: readonly AdaptableTabBarPlacement[]
  }
  springLoadingBehavior?: SpringLoadingBehavior
  accessibilityLabel?: string
  accessibilityHint?: string
  accessibilityValue?: string
  accessibilityIdentifier?: string
  help?: string
}
export interface TabProps extends TabContentProps {
  id: string
  title: string
  // a tab label shows an SF Symbol or an asset catalog image, never both.
  systemImage?: string
  image?: string
  badge?: string | number
  role?: TabRole
  tabPlacement?: TabPlacement
  testID?: string
  // an action tab carries onPress instead of a page. Swift.Tabs requires exactly one of them.
  onPress?: () => void
  children?: ReactNode
}
export interface TabSectionProps extends TabContentProps {
  id: string
  title: string
  defaultSectionExpansion?: TabSectionExpansion
  // sectionActions renders SwiftUI Buttons in the sidebar section header.
  sectionActions?: readonly {
    id: string
    title: string
    systemImage?: string
    onPress: () => void
  }[]
  children: ReactNode
}
export interface TabsProps extends ViewProps {
  selection: string
  onSelectionChange: (id: string) => void
  revision?: number
  tabViewStyle?: TabViewStyle
  // toolbarVisibility(_:for: .tabBar) on every page.
  tabBarVisibility?: Visibility
  // TabViewCustomization's Codable JSON. passing onCustomizationChange binds
  // tabViewCustomization; the JSON it reports is what to persist and pass back.
  customization?: string
  onCustomizationChange?: (customization: string) => void
  swiftStyle?: OneNativeStyle
  children: ReactNode
}

export interface TabViewSlotProps {
  name: TabViewSlotName
  height: number
  children: ReactNode
}

export interface TabViewBottomAccessoryProps {
  // tabViewBottomAccessory(isEnabled:), iOS 26.1: hides the accessory without remounting it.
  isEnabled?: boolean
  children?: ReactNode
  inline?: ReactNode
  expanded?: ReactNode
}
