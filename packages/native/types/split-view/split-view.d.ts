import type { ComponentType, ReactNode } from 'react';
export interface SplitViewColumnProps {
    children?: ReactNode;
}
export interface SplitViewProps {
    children?: ReactNode;
    slot?: ComponentType;
}
declare function SplitViewNavigator({ slot: Slot }: SplitViewProps): import("react/jsx-runtime").JSX.Element | null;
declare function SplitViewColumnComponent(props: SplitViewColumnProps): import("react/jsx-runtime").JSX.Element;
export declare const SplitView: typeof SplitViewNavigator & {
    Column: typeof SplitViewColumnComponent;
    Inspector: typeof SplitViewColumnComponent;
};
export {};
//# sourceMappingURL=split-view.d.ts.map