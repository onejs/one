import type { ParamListBase } from '@react-navigation/native';
import type { StackNavigationState } from '@react-navigation/routers';
import { type PropsWithChildren, type ReactElement } from 'react';
import type { UseStackResult } from './types';
export type HeadlessStackDescriptors = Record<string, {
    options: Record<string, any>;
    render: () => ReactElement;
}>;
type StackStateProviderProps = PropsWithChildren<{
    state: StackNavigationState<ParamListBase>;
    descriptors: HeadlessStackDescriptors;
}>;
export declare function StackStateProvider({ state, descriptors, children, }: StackStateProviderProps): import("react").FunctionComponentElement<import("react").ProviderProps<UseStackResult | null>>;
export declare function useStack(): UseStackResult;
export {};
//# sourceMappingURL=useStack.d.ts.map