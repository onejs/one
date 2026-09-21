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
import { NAVIGATOR_CONFIG } from '../../headless/children'

/**
 * Compound component for configuring stack headers.
 * Attach to Stack as `Stack.Header`.
 */
export const StackHeader = Object.assign(StackHeaderComponent, {
  [NAVIGATOR_CONFIG]: true,
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
}

export {
  StackScreen,
  appendScreenStackPropsToOptions,
  validateStackPresentation,
  type StackScreenProps,
  type StackScreenOptions,
} from './StackScreen'

export {
  StackToolbarComponent,
  StackToolbarItem,
  StackToolbarLeading,
  StackToolbarMenu,
  StackToolbarTrailing,
  appendStackToolbarPropsToOptions,
  type BottomToolbarData,
  type BottomToolbarItemData,
  type BottomToolbarMenuData,
  type StackToolbarBottomProps,
  type StackToolbarItemProps,
  type StackToolbarMenuProps,
  type StackToolbarPlacement,
  type StackToolbarProps,
  type StackToolbarSlotProps,
} from './StackToolbar'
