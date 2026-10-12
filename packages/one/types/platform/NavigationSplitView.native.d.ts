import type { NavigationSplitViewColumnProps, NavigationSplitViewProps } from './generated/containerTypes';
type SplitMarker = (props: NavigationSplitViewColumnProps) => never;
export declare const Sidebar: SplitMarker;
export declare const Content: SplitMarker;
export declare const Detail: SplitMarker;
declare function NavigationSplitViewView({ children, columnVisibility, onColumnVisibilityChange, preferredCompactColumn, onPreferredCompactColumnChange, swiftStyle, style, ...props }: NavigationSplitViewProps): import("react/jsx-runtime").JSX.Element;
export declare const NavigationSplitView: typeof NavigationSplitViewView & {
    Sidebar: SplitMarker;
    Content: SplitMarker;
    Detail: SplitMarker;
};
export {};
//# sourceMappingURL=NavigationSplitView.native.d.ts.map