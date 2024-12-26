import { type NavigationContainerRef, type ParamListBase } from '@react-navigation/core';
import type { LinkingOptions } from '@react-navigation/native';
import * as React from 'react';
type Options = LinkingOptions<ParamListBase>;
export default function useLinking(ref: React.RefObject<NavigationContainerRef<ParamListBase>>, { filter, config, getInitialURL, subscribe, getStateFromPath, getActionFromState, }: Options): {
    getInitialState: () => PromiseLike<(Partial<Omit<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[];
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>, "stale" | "routes">> & Readonly<{
        stale?: true;
        routes: import("@react-navigation/routers").PartialRoute<import("@react-navigation/routers").Route<string, object | undefined>>[];
    }> & {
        state?: Partial<Omit<Readonly<{
            key: string;
            index: number;
            routeNames: string[];
            history?: unknown[];
            routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
            type: string;
            stale: false;
        }>, "stale" | "routes">> & Readonly<{
            stale?: true;
            routes: import("@react-navigation/routers").PartialRoute<import("@react-navigation/routers").Route<string, object | undefined>>[];
        }> & /*elided*/ any;
    }) | undefined>;
};
export {};
//# sourceMappingURL=useLinking.native.d.ts.map