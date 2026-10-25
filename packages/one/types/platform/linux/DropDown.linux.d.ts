import type { ViewProps } from 'react-native';
export type DropDownItem = Readonly<{
    label: string;
    value: string;
}>;
export type DropDownProps = Omit<ViewProps, 'children'> & {
    disabled?: boolean;
    revision?: number;
} & ({
    labels: readonly string[];
    selectedIndex: number;
    onChange?: (event: {
        selectedIndex: number;
        revision: number;
    }) => void;
    items?: never;
    selection?: never;
    onSelectionChange?: never;
} | {
    items: readonly DropDownItem[];
    selection: string | null;
    onSelectionChange?: (event: {
        selection: string | null;
        revision: number;
    }) => void;
    labels?: never;
    selectedIndex?: never;
    onChange?: never;
});
export declare function DropDown({ labels, selectedIndex, onChange, items, selection, onSelectionChange, revision, style, ...props }: DropDownProps): import("react").JSX.Element;
//# sourceMappingURL=DropDown.linux.d.ts.map