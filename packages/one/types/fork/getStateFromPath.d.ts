/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/core/src/getStateFromPath.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */
import type { NavigationState, PartialState } from '@react-navigation/routers';
import type { PathConfigMap } from '@react-navigation/core';
import { type AdditionalRouteConfig } from './getStateFromPath-mods';
type Options<ParamList extends {}> = {
    path?: string;
    initialRouteName?: string;
    screens: PathConfigMap<ParamList>;
};
type ParseConfig = Record<string, (value: string) => any>;
export type RouteConfig = {
    screen: string;
    regex?: RegExp;
    path: string;
    pattern: string;
    routeNames: string[];
    parse?: ParseConfig;
} & AdditionalRouteConfig;
export type InitialRouteConfig = {
    initialRouteName: string;
    parentScreens: string[];
};
type ResultState = PartialState<NavigationState> & {
    state?: ResultState;
};
export type ParsedRoute = {
    name: string;
    path?: string;
    params?: Record<string, any> | undefined;
};
/**
 * Utility to parse a path string to initial state object accepted by the container.
 * This is useful for deep linking when we need to handle the incoming URL.
 *
 * @example
 * ```js
 * getStateFromPath(
 *   '/chat/jane/42',
 *   {
 *     screens: {
 *       Chat: {
 *         path: 'chat/:author/:id',
 *         parse: { id: Number }
 *       }
 *     }
 *   }
 * )
 * ```
 * @param path Path string to parse and convert, e.g. /foo/bar?count=42.
 * @param options Extra options to fine-tune how to parse the path.
 */
export declare function getStateFromPath<ParamList extends {}>(path: string, options?: Options<ParamList>): ResultState | undefined;
export {};
//# sourceMappingURL=getStateFromPath.d.ts.map