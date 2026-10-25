import type { ComponentType, ReactNode } from 'react';
export interface SplitViewColumnProps {
    children?: ReactNode;
}
export interface SplitViewProps {
    children?: ReactNode;
    slot?: ComponentType;
}
declare function SplitViewNavigator({ slot: Slot }: SplitViewProps): import("react").JSX.Element | null;
declare function SplitViewColumnComponent(props: SplitViewColumnProps): import("react").JSX.Element;
export declare const SplitView: typeof SplitViewNavigator & {
    Column: typeof SplitViewColumnComponent;
    Inspector: typeof SplitViewColumnComponent;
};
export {};
//# sourceMappingURL=split-view.macos.d.ts.map