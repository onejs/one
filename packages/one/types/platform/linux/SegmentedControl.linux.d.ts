import type { ControlledControlProps, ControlChange } from '../controlTypes';
export type SegmentedControlProps = ControlledControlProps & {
    labels: readonly string[];
    selectedIndex: number;
    onChange?: (event: ControlChange<{
        selectedIndex: number;
    }>) => void;
};
export declare function SegmentedControl({ labels, selectedIndex, revision, onChange, style, ...props }: SegmentedControlProps): import("react").JSX.Element;
//# sourceMappingURL=SegmentedControl.linux.d.ts.map