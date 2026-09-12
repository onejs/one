/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/useLinking.native.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */
import { type NavigationContainerRef, type ParamListBase } from '@react-navigation/core';
import type { LinkingOptions } from '@react-navigation/native';
import * as React from 'react';
type Options = LinkingOptions<ParamListBase>;
export declare function useLinking(ref: React.RefObject<NavigationContainerRef<ParamListBase>>, { enabled, prefixes, filter, config, getInitialURL, subscribe, getStateFromPath, getActionFromState, }: Options): {
    getInitialState: () => PromiseLike<import("@react-navigation/routers").PartialState<Readonly<{
        key: string;
        index: number;
        routeNames: string[];
        history?: unknown[] | undefined;
        routes: import("@react-navigation/routers").NavigationRoute<ParamListBase, string>[];
        type: string;
        stale: false;
    }>> | undefined>;
};
export {};
//# sourceMappingURL=useLinking.native.d.ts.map