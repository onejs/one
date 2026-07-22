import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { StackToolbarBadgeProps, StackToolbarButtonProps, StackToolbarIconProps, StackToolbarLabelProps, StackToolbarMenuActionProps, StackToolbarMenuProps, StackToolbarProps, StackToolbarSearchBarSlotProps, StackToolbarSpacerProps, StackToolbarViewProps } from './StackToolbar.types';
export declare function StackToolbarLabel(_props: StackToolbarLabelProps): null;
export declare function StackToolbarIcon(_props: StackToolbarIconProps): null;
export declare function StackToolbarBadge(_props: StackToolbarBadgeProps): null;
export declare function appendStackToolbarPropsToOptions(options: NativeStackNavigationOptions, props: StackToolbarProps): NativeStackNavigationOptions;
declare function StackToolbarComponent(props: StackToolbarProps): import("react/jsx-runtime").JSX.Element | null;
export declare function StackToolbarButton(props: StackToolbarButtonProps): import("react/jsx-runtime").JSX.Element | null;
export declare function StackToolbarMenu(props: StackToolbarMenuProps): import("react/jsx-runtime").JSX.Element | null;
export declare function StackToolbarMenuAction(props: StackToolbarMenuActionProps): import("react/jsx-runtime").JSX.Element | null;
export declare function StackToolbarSpacer(props: StackToolbarSpacerProps): import("react/jsx-runtime").JSX.Element | null;
export declare function StackToolbarSearchBarSlot(props: StackToolbarSearchBarSlotProps): import("react/jsx-runtime").JSX.Element | null;
export declare function StackToolbarView(props: StackToolbarViewProps): import("react/jsx-runtime").JSX.Element | null;
export declare const StackToolbar: typeof StackToolbarComponent & {
    __oneNavigatorConfig: boolean;
    Button: typeof StackToolbarButton;
    Menu: typeof StackToolbarMenu;
    MenuAction: typeof StackToolbarMenuAction;
    Spacer: typeof StackToolbarSpacer;
    SearchBarSlot: typeof StackToolbarSearchBarSlot;
    View: typeof StackToolbarView;
    Label: typeof StackToolbarLabel;
    Icon: typeof StackToolbarIcon;
    Badge: typeof StackToolbarBadge;
};
export type { StackToolbarBadgeProps, StackToolbarButtonProps, StackToolbarIconProps, StackToolbarLabelProps, StackToolbarMenuActionProps, StackToolbarMenuProps, StackToolbarPlacement, StackToolbarProps, StackToolbarSearchBarSlotProps, StackToolbarSpacerProps, StackToolbarViewProps, } from './StackToolbar.types';
//# sourceMappingURL=StackToolbar.d.ts.map