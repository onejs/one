import { StackHeaderBackButton, type StackHeaderBackButtonProps } from './StackHeaderBackButton.js';
import { StackHeaderComponent, type StackHeaderProps } from './StackHeaderComponent.js';
import { StackHeaderLeft, type StackHeaderLeftProps } from './StackHeaderLeft.js';
import { StackHeaderRight, type StackHeaderRightProps } from './StackHeaderRight.js';
import { StackHeaderSearchBar, type StackHeaderSearchBarProps } from './StackHeaderSearchBar.js';
import { StackHeaderTitle, type StackHeaderTitleProps } from './StackHeaderTitle.js';
/**
 * Compound component for configuring stack headers.
 * Attach to Stack as `Stack.Header`.
 */
export declare const StackHeader: typeof StackHeaderComponent & {
    __oneNavigatorConfig: boolean;
    Left: typeof StackHeaderLeft;
    Right: typeof StackHeaderRight;
    BackButton: typeof StackHeaderBackButton;
    Title: typeof StackHeaderTitle;
    SearchBar: typeof StackHeaderSearchBar;
};
export { StackHeaderBackButton, type StackHeaderBackButtonProps, StackHeaderComponent, type StackHeaderProps, StackHeaderLeft, type StackHeaderLeftProps, StackHeaderRight, type StackHeaderRightProps, StackHeaderSearchBar, type StackHeaderSearchBarProps, StackHeaderTitle, type StackHeaderTitleProps, };
export { StackScreen, appendScreenStackPropsToOptions, validateStackPresentation, type StackScreenProps, type StackScreenOptions, } from './StackScreen.js';
export { BottomToolbarHost, type BottomToolbarHostProps, } from './StackToolbarBottomHost.js';
export { StackToolbarBadge, StackToolbarButton, StackToolbarComponent, StackToolbarIcon, StackToolbarLabel, StackToolbarMenu, StackToolbarMenuAction, StackToolbarSearchBarSlot, StackToolbarSpacer, appendStackToolbarPropsToOptions, type BottomToolbarButtonData, type BottomToolbarData, type BottomToolbarMenuActionData, type BottomToolbarMenuData, type BottomToolbarSearchBarSlotData, type BottomToolbarSpacerData, type BottomToolbarSubmenuData, type StackToolbarBadgeProps, type StackToolbarButtonProps, type StackToolbarIconProps, type StackToolbarLabelProps, type StackToolbarMenuActionProps, type StackToolbarMenuProps, type StackToolbarPlacement, type StackToolbarProps, type StackToolbarSearchBarSlotProps, type StackToolbarSpacerProps, type StackToolbarVariant, } from './StackToolbar.js';
//# sourceMappingURL=index.d.ts.map