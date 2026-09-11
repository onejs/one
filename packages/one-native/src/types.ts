import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'

export interface TabProps {
  id: string
  title: string
  systemImage?: string
  badge?: string
  testID?: string
  children: ReactNode
}

export interface TabsProps extends ViewProps {
  selection: string
  onSelectionChange: (id: string) => void
  sidebarAdaptable?: boolean
}

export interface MenuAction {
  type: 'action'
  id: string
  title: string
  subtitle?: string
  systemImage?: string
  state?: 'off' | 'on' | 'mixed'
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
  keepsMenuPresented?: boolean
  discoverabilityTitle?: string
}

export interface MenuSubmenu {
  type: 'submenu'
  id: string
  title: string
  subtitle?: string
  systemImage?: string
  destructive?: boolean
  displayInline?: boolean
  singleSelection?: boolean
  displayAsPalette?: boolean
  preferredElementSize?: 'automatic' | 'small' | 'medium' | 'large'
  children: readonly MenuItem[]
}

export type MenuItem = MenuAction | MenuSubmenu

export interface MenuProps extends ViewProps {
  items: readonly MenuItem[]
  onAction: (id: string) => void
  accessibilityLabel: string
  title?: string
  disabled?: boolean
  children: ReactNode
}
