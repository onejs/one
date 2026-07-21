import type { ReactElement, ReactNode } from 'react';
export type ScreenEntry = {
    key: string;
    name: string;
    params: Record<string, any>;
    href: string;
    isFocused: boolean;
    keepMounted: boolean;
    options: Record<string, any>;
    element: ReactElement;
};
export type StackNavigation = {
    back: () => void;
    push: (href: string) => void;
    replace: (href: string) => void;
};
export type UseStackResult = {
    screens: ScreenEntry[];
    focused: ScreenEntry;
    navigation: StackNavigation;
};
export type UseTabsResult = {
    tabs: ScreenEntry[];
    focused: ScreenEntry;
    navigation: {
        switchTab: (name: string) => void;
    };
};
export type UseDrawerResult = {
    screens: ScreenEntry[];
    focused: ScreenEntry;
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
};
export type SheetRenderOptions = {
    sheetAllowedDetents?: number[] | 'fitToContents';
    sheetGrabberVisible?: boolean;
    sheetCornerRadius?: number;
    sheetExpandsWhenScrolledToEdge?: boolean;
    gestureEnabled?: boolean;
    title?: string;
};
export type ModalRenderOptions = {
    gestureEnabled?: boolean;
    title?: string;
};
export type NavigationRenderOpts = {
    type: 'sheet';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: SheetRenderOptions;
    screen: ScreenEntry;
    children: ReactNode;
} | {
    type: 'modal';
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: ModalRenderOptions;
    screen: ScreenEntry;
    children: ReactNode;
};
export type NavigationRenderWebCallback = (opts: NavigationRenderOpts) => ReactNode | undefined;
//# sourceMappingURL=types.d.ts.map