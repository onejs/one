/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/useLinking.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */
import { getStateFromPath as getStateFromPathDefault, type NavigationContainerRef, type ParamListBase } from '@react-navigation/core';
import * as React from 'react';
import type { LinkingOptions } from '@react-navigation/native';
type ResultState = ReturnType<typeof getStateFromPathDefault>;
/**
 * Run async function in series as it's called.
 */
export declare const series: (cb: () => Promise<void>) => () => void;
type Options = LinkingOptions<ParamListBase>;
export declare function useLinking(ref: React.RefObject<NavigationContainerRef<ParamListBase>>, { enabled, config, getStateFromPath, getPathFromState, getActionFromState, }: Options, onUnhandledLinking: (lastUnhandledLining: string | undefined) => void): {
    getInitialState: () => PromiseLike<ResultState | undefined>;
};
export {};
//# sourceMappingURL=useLinking.d.ts.map