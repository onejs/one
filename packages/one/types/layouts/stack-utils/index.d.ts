import { StackHeaderBackButton, type StackHeaderBackButtonProps } from './StackHeaderBackButton';
import { StackHeaderComponent, type StackHeaderProps } from './StackHeaderComponent';
import { StackHeaderLeft, type StackHeaderLeftProps } from './StackHeaderLeft';
import { StackHeaderRight, type StackHeaderRightProps } from './StackHeaderRight';
import { StackHeaderSearchBar, type StackHeaderSearchBarProps } from './StackHeaderSearchBar';
import { StackHeaderTitle, type StackHeaderTitleProps } from './StackHeaderTitle';
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
export { StackScreen, appendScreenStackPropsToOptions, validateStackPresentation, type StackScreenProps, type StackScreenOptions, } from './StackScreen';
export { StackToolbarComponent, StackToolbarItem, StackToolbarLeading, StackToolbarMenu, StackToolbarTrailing, appendStackToolbarPropsToOptions, type BottomToolbarData, type BottomToolbarItemData, type BottomToolbarMenuData, type StackToolbarBottomProps, type StackToolbarItemProps, type StackToolbarMenuProps, type StackToolbarPlacement, type StackToolbarProps, type StackToolbarSlotProps, } from './StackToolbar';
//# sourceMappingURL=index.d.ts.map