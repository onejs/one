/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/core/src/getPathFromState.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */
import { type NavigationContainerProps, type NavigationContainerRef, type ParamListBase } from '@react-navigation/core';
import { type DocumentTitleOptions, type LinkingOptions, type LocaleDirection } from '@react-navigation/native';
import * as React from 'react';
type Props<ParamList extends {}> = NavigationContainerProps & {
    direction?: LocaleDirection;
    linking?: LinkingOptions<ParamList>;
    fallback?: React.ReactNode;
    documentTitle?: DocumentTitleOptions;
};
export declare const NavigationContainer: <RootParamList extends {} = ParamListBase>(props: Props<RootParamList> & {
    ref?: React.Ref<NavigationContainerRef<RootParamList>>;
}) => React.ReactElement;
export {};
//# sourceMappingURL=NavigationContainer.d.ts.map