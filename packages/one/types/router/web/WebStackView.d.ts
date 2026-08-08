import type { ParamListBase } from '@react-navigation/core';
import { type StackActionHelpers, type StackNavigationState } from '@react-navigation/routers';
import type { NativeStackNavigationEventMap, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type ReactElement, type ReactNode } from 'react';
type RouteOptions = Omit<NativeStackNavigationOptions, 'presentation'> & {
    keepMounted?: boolean;
    presentation?: NativeStackNavigationOptions['presentation'] | 'sheet' | string;
};
type Descriptors = Record<string, {
    options: RouteOptions;
    render: () => ReactElement;
    navigation: any;
}>;
type WebStackViewProps = {
    state: StackNavigationState<ParamListBase>;
    navigation: StackActionHelpers<ParamListBase> & {
        goBack: () => void;
        dispatch: (action: any) => void;
    };
    descriptors: Descriptors;
    customChildren?: ReactNode[];
    eventMap?: NativeStackNavigationEventMap;
};
export declare function WebStackView({ state, navigation, descriptors, customChildren, }: WebStackViewProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=WebStackView.d.ts.map