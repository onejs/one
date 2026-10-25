import type { ViewProps } from 'react-native';
export type DropDownProps = Omit<ViewProps, 'children'> & {
    labels: readonly string[];
    selectedIndex: number;
    disabled?: boolean;
    revision?: number;
    onChange?: (event: {
        selectedIndex: number;
        revision: number;
    }) => void;
};
export declare function DropDown({ labels, selectedIndex, revision, onChange, style, ...props }: DropDownProps): import("react").JSX.Element;
//# sourceMappingURL=DropDown.linux.d.ts.map