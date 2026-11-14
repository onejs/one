import type { EventMapBase, NavigationState } from '@react-navigation/native';
import React from 'react';
import type { OneRouter } from '../interfaces/router.js';
import { type ScreenProps } from '../router/useScreens.js';
import type { PickPartial } from '../types.js';
export declare function useFilterScreenChildren(children: React.ReactNode, { isCustomNavigator, contextKey, }?: {
    isCustomNavigator?: boolean;
    /** Used for sending developer hints */
    contextKey?: string;
}): {
    screens: any[];
    children: any[];
    protectedScreens: Set<string>;
    guardedRedirects: Map<string, OneRouter.Href<{
        __branded__: any;
    }> | undefined>;
};
export declare function useResolvedGuardedRedirects(guardedRedirects: Map<string, OneRouter.Href | undefined>): Map<string, OneRouter.Href<{
    __branded__: any;
}> | undefined>;
type ScreenOptionsArgs<TProps> = Extract<TProps extends {
    screenOptions?: infer O;
} ? O : never, (...args: any[]) => any> extends (args: infer A) => any ? A : never;
export type LayoutNavigator<TProps extends {
    children: React.ReactNode;
}, TOptions extends object> = React.ForwardRefExoticComponent<Omit<TProps, 'children' | 'screenOptions'> & {
    children?: React.ReactNode;
    id?: string;
    screenOptions?: TOptions | ((args: ScreenOptionsArgs<TProps>) => TOptions);
} & React.RefAttributes<unknown>>;
export type LayoutScreen<TOptions extends object, State extends NavigationState, EventMap extends EventMapBase> = React.ComponentType<ScreenProps<TOptions, State, EventMap>>;
/** Return a navigator that automatically injects matched routes and renders nothing when there are no children. Return type with children prop optional */
export declare function withLayoutContext<TOptions extends object, T extends React.ComponentType<any>, State extends NavigationState, EventMap extends EventMapBase>(Nav: T, processor?: (options: ScreenProps<TOptions, State, EventMap>[]) => ScreenProps<TOptions, State, EventMap>[], options?: {
    props?: any;
    undeclaredRoutes?: boolean;
}): React.ForwardRefExoticComponent<React.PropsWithoutRef<PickPartial<React.ComponentProps<T>, "children">> & React.RefAttributes<unknown>> & {
    Screen: LayoutScreen<TOptions, State, EventMap>;
};
export {};
//# sourceMappingURL=withLayoutContext.d.ts.map