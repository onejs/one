import type { ViewProps } from 'react-native';
export type PopUpButtonProps = Omit<ViewProps, 'children'> & {
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
export declare function PopUpButton({ labels, selectedIndex, revision, onChange, ...props }: PopUpButtonProps): import("react").JSX.Element;
//# sourceMappingURL=PopUpButton.macos.d.ts.map