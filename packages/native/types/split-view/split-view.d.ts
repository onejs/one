import React, { type ReactNode } from 'react';
import { type SplitHostProps } from 'react-native-screens/experimental';
export interface SplitViewColumnProps {
    children?: React.ReactNode;
}
declare function SplitViewColumnComponent(props: SplitViewColumnProps): import("react/jsx-runtime").JSX.Element;
declare function SplitViewInspectorComponent(props: SplitViewColumnProps): import("react/jsx-runtime").JSX.Element;
export interface SplitViewProps extends Omit<SplitHostProps, 'children'> {
    children?: ReactNode;
    /** slot component to render for the main content area */
    slot?: React.ComponentType;
}
declare function SplitViewNavigator({ children, slot: Slot, ...splitViewHostProps }: SplitViewProps): import("react/jsx-runtime").JSX.Element | null;
export declare const SplitView: typeof SplitViewNavigator & {
    Column: typeof SplitViewColumnComponent;
    Inspector: typeof SplitViewInspectorComponent;
};
export {};
//# sourceMappingURL=split-view.d.ts.map