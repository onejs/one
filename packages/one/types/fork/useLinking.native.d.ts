import { type NavigationContainerRef, type ParamListBase } from '@react-navigation/core';
import type { LinkingOptions } from '@react-navigation/native';
import * as React from 'react';
type Options = LinkingOptions<ParamListBase>;
export default function useLinking(ref: React.RefObject<NavigationContainerRef<ParamListBase>>, { filter, config, getInitialURL, subscribe, getStateFromPath, getActionFromState, }: Options): {
    getInitialState: () => any;
};
export {};
//# sourceMappingURL=useLinking.native.d.ts.map