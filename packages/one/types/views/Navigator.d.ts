import { useNavigationBuilder, type RouterFactory } from '@react-navigation/native';
import * as React from 'react';
type NavigatorTypes = ReturnType<typeof useNavigationBuilder>;
export declare const NavigatorContext: React.Context<{
    contextKey: string;
    state: NavigatorTypes["state"];
    navigation: NavigatorTypes["navigation"];
    descriptors: NavigatorTypes["descriptors"];
    router: RouterFactory<any, any, any>;
} | null>;
export type NavigatorProps = {
    initialRouteName?: Parameters<typeof useNavigationBuilder>[1]['initialRouteName'];
    screenOptions?: Parameters<typeof useNavigationBuilder>[1]['screenOptions'];
    children?: Parameters<typeof useNavigationBuilder>[1]['children'];
    router?: Parameters<typeof useNavigationBuilder>[0];
};
/** An unstyled custom navigator. Good for basic web layouts */
export declare function Navigator({ initialRouteName, screenOptions, children, router }: NavigatorProps): import("react/jsx-runtime").JSX.Element | null;
export declare namespace Navigator {
    var Slot: React.NamedExoticComponent<Omit<NavigatorProps, "children">>;
    var useContext: typeof useNavigatorContext;
    var Screen: typeof import("./Screen").Screen;
}
export declare function useNavigatorContext(): {
    contextKey: string;
    state: NavigatorTypes["state"];
    navigation: NavigatorTypes["navigation"];
    descriptors: NavigatorTypes["descriptors"];
    router: RouterFactory<any, any, any>;
};
export declare function useSlot(): React.JSX.Element | null;
/** Renders the currently selected content. */
export declare const Slot: React.NamedExoticComponent<Omit<NavigatorProps, "children">>;
export declare function QualifiedSlot(): React.JSX.Element | null;
export declare function DefaultNavigator(): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Navigator.d.ts.map