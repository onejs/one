import { type ComponentType, type ReactNode } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
/**
 * Props passed to a user-supplied screen-render component. Mirrors the
 * native-stack option shape so the same render works for any overlay
 * presentation (modal, formSheet, pageSheet, ...).
 *
 * `open` is driven by the router. The render component decides how to
 * animate based on transitions of `open`, and calls `dismiss()` after its
 * close animation completes (this triggers the actual `StackActions.pop`).
 */
export type StackRenderProps = {
    routeKey: string;
    routeName: string;
    presentation: NonNullable<NativeStackNavigationOptions['presentation']>;
    /**
     * Whether this overlay should currently be visible. For non-keepMounted
     * routes, this is always `true` while the render is invoked. For
     * keepMounted routes, this toggles as the user navigates away from /
     * back to this route — the React subtree stays mounted in both states.
     */
    open: boolean;
    dismiss: () => void;
    dismissible: boolean;
    sheetAllowedDetents?: number[] | 'fitToContents';
    sheetGrabberVisible?: boolean;
    sheetCornerRadius?: number;
    sheetInitialDetentIndex?: number | 'last';
    sheetLargestUndimmedDetentIndex?: number | 'none' | 'last';
    sheetExpandsWhenScrolledToEdge?: boolean;
    children: ReactNode;
};
export type StackRenderComponent = ComponentType<StackRenderProps>;
/**
 * Platform-keyed render map. v1 consumes `web` only; `ios`/`android` are
 * reserved for future use (a route overrides react-native-screens' native
 * sheet with a custom impl).
 */
export type StackRender = {
    web?: StackRenderComponent;
    ios?: StackRenderComponent;
    android?: StackRenderComponent;
};
export declare const StackRenderProvider: import("react").Provider<StackRender | undefined>;
export declare function useStackRender(): StackRender | undefined;
//# sourceMappingURL=ScreenRenderContext.d.ts.map