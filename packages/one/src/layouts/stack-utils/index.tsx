import {
  StackHeaderBackButton,
  type StackHeaderBackButtonProps,
} from './StackHeaderBackButton'
import { StackHeaderComponent, type StackHeaderProps } from './StackHeaderComponent'
import { StackHeaderLeft, type StackHeaderLeftProps } from './StackHeaderLeft'
import { StackHeaderRight, type StackHeaderRightProps } from './StackHeaderRight'
import {
  StackHeaderSearchBar,
  type StackHeaderSearchBarProps,
} from './StackHeaderSearchBar'
import { StackHeaderTitle, type StackHeaderTitleProps } from './StackHeaderTitle'
import { StackToolbar } from './StackToolbar'

/**
 * Compound component for configuring stack headers.
 * Attach to Stack as `Stack.Header`.
 */
export const StackHeader = Object.assign(StackHeaderComponent, {
  Left: StackHeaderLeft,
  Right: StackHeaderRight,
  BackButton: StackHeaderBackButton,
  Title: StackHeaderTitle,
  SearchBar: StackHeaderSearchBar,
})

export {
  StackHeaderBackButton,
  type StackHeaderBackButtonProps,
  StackHeaderComponent,
  type StackHeaderProps,
  StackHeaderLeft,
  type StackHeaderLeftProps,
  StackHeaderRight,
  type StackHeaderRightProps,
  StackHeaderSearchBar,
  type StackHeaderSearchBarProps,
  StackHeaderTitle,
  type StackHeaderTitleProps,
  StackToolbar,
}

export type {
  StackToolbarBadgeProps,
  StackToolbarButtonProps,
  StackToolbarIconProps,
  StackToolbarLabelProps,
  StackToolbarMenuActionProps,
  StackToolbarMenuProps,
  StackToolbarPlacement,
  StackToolbarProps,
  StackToolbarSearchBarSlotProps,
  StackToolbarSpacerProps,
  StackToolbarViewProps,
} from './StackToolbar'

export {
  StackScreen,
  appendScreenStackPropsToOptions,
  validateStackPresentation,
  type StackScreenProps,
  type StackScreenOptions,
} from './StackScreen'
