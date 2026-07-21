import { type DrawerActionHelpers, type DrawerNavigationState, type ParamListBase } from '@react-navigation/routers';
import { type PropsWithChildren, type ReactElement } from 'react';
import type { UseDrawerResult } from './types';
export type HeadlessDrawerDescriptors = Record<string, {
    options: Record<string, any>;
    render: () => ReactElement;
}>;
type HeadlessDrawerNavigation = DrawerActionHelpers<ParamListBase> & {
    dispatch: (action: any) => void;
};
type DrawerStateProviderProps = PropsWithChildren<{
    state: DrawerNavigationState<ParamListBase>;
    descriptors: HeadlessDrawerDescriptors;
    navigation: HeadlessDrawerNavigation;
}>;
export declare function DrawerStateProvider({ state, descriptors, navigation, children, }: DrawerStateProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useDrawer(): UseDrawerResult;
export {};
//# sourceMappingURL=useDrawer.d.ts.map