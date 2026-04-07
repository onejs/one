import { type CommonNavigationAction, type ParamListBase, type TabActionType as RNTabActionType, type TabRouterOptions as RNTabRouterOptions, type Router, type TabNavigationState } from '@react-navigation/native';
import type { TriggerMap } from './common';
export type ExpoTabRouterOptions = RNTabRouterOptions & {
    triggerMap: TriggerMap;
};
export type ExpoTabActionType = RNTabActionType | CommonNavigationAction | {
    type: 'JUMP_TO';
    source?: string;
    target?: string;
    payload: {
        name: string;
        resetOnFocus?: boolean;
        params?: object;
    };
};
export declare function ExpoTabRouter(options: ExpoTabRouterOptions): Router<TabNavigationState<ParamListBase>, {
    type: "GO_BACK";
    source?: string | undefined;
    target?: string | undefined;
} | {
    type: "NAVIGATE";
    payload: {
        name: string;
        params?: object | undefined;
        path?: string | undefined;
        merge?: boolean | undefined;
        pop?: boolean | undefined;
    };
    source?: string | undefined;
    target?: string | undefined;
} | {
    type: "RESET";
    payload: Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }> | import("@react-navigation/routers").PartialState<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>> | (Omit<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>, "routes"> & {
        routes: Omit<import("@react-navigation/routers").Route<string>, "key">[];
    });
    source?: string | undefined;
    target?: string | undefined;
} | {
    type: "SET_PARAMS";
    payload: {
        params?: object | undefined;
    };
    source?: string | undefined;
    target?: string | undefined;
} | {
    type: "REPLACE_PARAMS";
    payload: {
        params?: object | undefined;
    };
    source?: string | undefined;
    target?: string | undefined;
} | {
    type: "PUSH_PARAMS";
    payload: {
        params?: object | undefined;
    };
    source?: string | undefined;
    target?: string | undefined;
} | {
    type: "PRELOAD";
    payload: {
        name: string;
        params?: object | undefined;
    };
    source?: string | undefined;
    target?: string | undefined;
} | RNTabActionType | {
    type: "JUMP_TO";
    source?: string;
    target?: string;
    payload: {
        name: string;
        resetOnFocus?: boolean;
        params?: object;
    };
}>;
//# sourceMappingURL=TabRouter.d.ts.map