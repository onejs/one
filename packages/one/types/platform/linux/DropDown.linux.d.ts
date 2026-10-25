import type { ControlledControlProps, ControlChange } from '../controlTypes';
export type DropDownItem = Readonly<{
    label: string;
    value: string;
}>;
export type DropDownProps = ControlledControlProps & ({
    labels: readonly string[];
    selectedIndex: number;
    onChange?: (event: ControlChange<{
        selectedIndex: number;
    }>) => void;
    items?: never;
    selection?: never;
    onSelectionChange?: never;
} | {
    items: readonly DropDownItem[];
    selection: string | null;
    onSelectionChange?: (event: ControlChange<{
        selection: string | null;
    }>) => void;
    labels?: never;
    selectedIndex?: never;
    onChange?: never;
});
export declare function DropDown({ labels, selectedIndex, onChange, items, selection, onSelectionChange, revision, style, ...props }: DropDownProps): import("react").JSX.Element;
//# sourceMappingURL=DropDown.linux.d.ts.map