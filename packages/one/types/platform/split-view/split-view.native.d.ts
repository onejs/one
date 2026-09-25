import React, { type ReactNode } from 'react';
export interface SplitViewColumnProps {
    children?: React.ReactNode;
}
declare function SplitViewColumnComponent(props: SplitViewColumnProps): import("react/jsx-runtime").JSX.Element;
declare function SplitViewInspectorComponent(props: SplitViewColumnProps): import("react/jsx-runtime").JSX.Element;
export interface SplitViewProps {
    children?: ReactNode;
    slot?: React.ComponentType;
}
declare function SplitViewNavigator({ children, slot: Slot, ...rest }: SplitViewProps): import("react/jsx-runtime").JSX.Element | null;
export declare const SplitView: typeof SplitViewNavigator & {
    Column: typeof SplitViewColumnComponent;
    Inspector: typeof SplitViewInspectorComponent;
};
export {};
//# sourceMappingURL=split-view.native.d.ts.map