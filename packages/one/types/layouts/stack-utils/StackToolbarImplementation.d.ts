import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type PropsWithChildren, type ReactNode } from 'react';
import type { StackToolbarProps } from './StackToolbar.types';
export declare const STACK_TOOLBAR_CHILD: unique symbol;
export type StackToolbarChildType = 'button' | 'menu' | 'menuAction' | 'spacer' | 'searchBarSlot' | 'view' | 'label' | 'icon' | 'badge';
export type StackToolbarImplementation = {
    appendPropsToOptions: (options: NativeStackNavigationOptions, props: StackToolbarProps) => NativeStackNavigationOptions;
    render: (props: StackToolbarProps) => ReactNode;
};
export declare function StackToolbarImplementationProvider({ children, implementation, }: PropsWithChildren<{
    implementation: StackToolbarImplementation;
}>): import("react/jsx-runtime").JSX.Element;
export declare function useStackToolbarImplementation(): StackToolbarImplementation | null;
//# sourceMappingURL=StackToolbarImplementation.d.ts.map