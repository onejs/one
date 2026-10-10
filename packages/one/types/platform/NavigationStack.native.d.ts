import { type ReactNode } from 'react';
import type { NavigationStackProps, ToolbarItemGroupProps, ToolbarItemProps, ToolbarProps, ToolbarContentProps, ToolbarSpacerProps } from './generated/containerTypes';
declare function ToolbarMarker(_props: ToolbarProps): never;
export declare function ToolbarContent(_props: ToolbarContentProps): never;
export declare const Toolbar: typeof ToolbarMarker & {
    Content: typeof ToolbarContent;
};
export declare function ToolbarItem(_props: ToolbarItemProps): never;
export declare function ToolbarItemGroup(_props: ToolbarItemGroupProps): never;
export declare function ToolbarSpacer(_props: ToolbarSpacerProps): never;
export declare function ToolbarNode({ children, iosVersion, }: {
    children: ReactNode;
    iosVersion: number;
}): import("react/jsx-runtime").JSX.Element;
export declare function NavigationStack({ children, swiftStyle, style, ...props }: NavigationStackProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=NavigationStack.native.d.ts.map