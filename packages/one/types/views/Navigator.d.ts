import { type RouterFactory, useNavigationBuilder } from '@react-navigation/native';
import * as React from 'react';
type NavigatorTypes = ReturnType<typeof useNavigationBuilder>;
import type { RouteNode } from '../router/Route';
export interface SlotState {
    /** The route key currently being rendered in this slot (null = show default) */
    activeRouteKey: string | null;
    /** The actual RouteNode to render (needed because slot routes aren't in navigator) */
    activeRouteNode?: RouteNode;
    /** Params extracted from the matched path */
    params?: Record<string, string>;
    /** Whether this is from an interception (soft nav) or direct nav */
    isIntercepted: boolean;
}
export declare function getSlotState(slotName: string): SlotState | undefined;
export declare function setSlotState(slotName: string, state: SlotState | null): void;
export declare function clearAllSlotStates(): void;
export declare const NavigatorContext: React.Context<{
    contextKey: string;
    state: NavigatorTypes["state"];
    navigation: NavigatorTypes["navigation"];
    descriptorsRef: React.MutableRefObject<NavigatorTypes["descriptors"]>;
    router: RouterFactory<any, any, any>;
} | null>;
export type NavigatorProps = {
    initialRouteName?: Parameters<typeof useNavigationBuilder>[1]['initialRouteName'];
    screenOptions?: Parameters<typeof useNavigationBuilder>[1]['screenOptions'];
    children?: Parameters<typeof useNavigationBuilder>[1]['children'];
    router?: Parameters<typeof useNavigationBuilder>[0];
};
/** An unstyled custom navigator. Good for basic web layouts */
export declare function Navigator({ initialRouteName, screenOptions, children, router, }: NavigatorProps): import("react/jsx-runtime").JSX.Element | null;
export declare namespace Navigator {
    var Slot: React.NamedExoticComponent<Omit<NavigatorProps, "children">>;
    var useContext: typeof useNavigatorContext;
    var Screen: typeof import("./Screen").Screen;
}
export declare function useNavigatorContext(): {
    contextKey: string;
    state: NavigatorTypes["state"];
    navigation: NavigatorTypes["navigation"];
    descriptorsRef: React.MutableRefObject<NavigatorTypes["descriptors"]>;
    router: RouterFactory<any, any, any>;
};
export declare function useSlot(): React.FunctionComponentElement<any> | null;
/** Renders the currently selected content. */
export declare const Slot: React.NamedExoticComponent<Omit<NavigatorProps, "children">>;
export declare function QualifiedSlot(): React.FunctionComponentElement<any> | null;
export declare function DefaultNavigator(): import("react/jsx-runtime").JSX.Element;
/**
 * Hook to get the render output for a named slot (e.g., @modal, @sidebar).
 * Returns null if no intercept is active, otherwise returns the intercepted route element.
 */
export declare function useNamedSlot(slotName: string): React.ReactNode | null;
/**
 * Named slot component for use in layouts.
 * Renders the slot content if an intercept is active, otherwise renders children (default).
 *
 * @example
 * ```tsx
 * // In a layout file:
 * export default function Layout({ children, modal }) {
 *   return (
 *     <>
 *       {children}
 *       <NamedSlot name="modal">{modal}</NamedSlot>
 *     </>
 *   )
 * }
 * ```
 */
export declare function NamedSlot({ name, children, }: {
    /** The slot name (matches @slotName directory) */
    name: string;
    /** Default content when no intercept is active */
    children?: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Navigator.d.ts.map