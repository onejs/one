import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type StackToolbarImplementation } from './StackToolbarImplementation';
import type { StackToolbarBadgeProps, StackToolbarButtonProps, StackToolbarIconProps, StackToolbarLabelProps, StackToolbarMenuActionProps, StackToolbarMenuProps, StackToolbarProps, StackToolbarSearchBarSlotProps, StackToolbarSpacerProps, StackToolbarViewProps } from './StackToolbar.types';
export declare function appendStackToolbarPropsToOptions(options: NativeStackNavigationOptions, props: StackToolbarProps, implementation?: StackToolbarImplementation | null): NativeStackNavigationOptions;
declare function StackToolbarComponent(props: StackToolbarProps): string | number | bigint | boolean | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<import("react").ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<import("react").ReactNode> | null | undefined> | null;
export declare function StackToolbarButton(_props: StackToolbarButtonProps): null;
export declare function StackToolbarMenu(_props: StackToolbarMenuProps): null;
export declare function StackToolbarMenuAction(_props: StackToolbarMenuActionProps): null;
export declare function StackToolbarSpacer(_props: StackToolbarSpacerProps): null;
export declare function StackToolbarSearchBarSlot(_props: StackToolbarSearchBarSlotProps): null;
export declare function StackToolbarView(_props: StackToolbarViewProps): null;
export declare function StackToolbarLabel(_props: StackToolbarLabelProps): null;
export declare function StackToolbarIcon(_props: StackToolbarIconProps): null;
export declare function StackToolbarBadge(_props: StackToolbarBadgeProps): null;
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
export type { StackToolbarBadgeProps, StackToolbarButtonProps, StackToolbarConfig, StackToolbarIconProps, StackToolbarLabelProps, StackToolbarMenuActionProps, StackToolbarMenuProps, StackToolbarPlacement, StackToolbarProps, StackToolbarSearchBarSlotProps, StackToolbarSpacerProps, StackToolbarViewProps, } from './StackToolbar.types';
//# sourceMappingURL=StackToolbar.d.ts.map