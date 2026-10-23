import type { ViewProps } from 'react-native';
export type SegmentedControlProps = Omit<ViewProps, 'children' | 'role'> & {
    labels: readonly string[];
    /** zero based selection, or -1 for no selection. */
    selectedIndex: number;
    disabled?: boolean;
    /** tabs and value selection use the system roles on macOS 27 and later. */
    role?: 'automatic' | 'tabs' | 'valueSelection';
    revision?: number;
    onChange?: (event: {
        selectedIndex: number;
        revision: number;
    }) => void;
};
export declare function SegmentedControl({ labels, selectedIndex, revision, role, onChange, ...props }: SegmentedControlProps): import("react").JSX.Element;
//# sourceMappingURL=SegmentedControl.macos.d.ts.map