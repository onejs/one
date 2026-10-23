import type { ViewProps } from 'react-native';
export type SegmentedControlProps = Omit<ViewProps, 'children'> & {
    labels: readonly string[];
    /** zero based selection, or -1 for no selection. */
    selectedIndex: number;
    disabled?: boolean;
    revision?: number;
    onChange?: (event: {
        selectedIndex: number;
        revision: number;
    }) => void;
};
export declare function SegmentedControl({ labels, selectedIndex, revision, onChange, ...props }: SegmentedControlProps): import("react").JSX.Element;
//# sourceMappingURL=SegmentedControl.macos.d.ts.map