import type { ViewProps } from 'react-native';
export type SegmentedControlProps = Omit<ViewProps, 'children'> & {
    labels: readonly string[];
    selectedIndex: number;
    disabled?: boolean;
    revision?: number;
    onChange?: (event: {
        selectedIndex: number;
        revision: number;
    }) => void;
};
export declare function SegmentedControl({ labels, selectedIndex, revision, onChange, style, ...props }: SegmentedControlProps): import("react").JSX.Element;
//# sourceMappingURL=SegmentedControl.linux.d.ts.map