import type { ViewProps } from 'react-native';
export type ToggleProps = Omit<ViewProps, 'children'> & {
    label: string;
    isOn: boolean;
    disabled?: boolean;
    revision?: number;
    onIsOnChange?: (event: {
        isOn: boolean;
        revision: number;
    }) => void;
};
export declare function Toggle({ label, isOn, revision, onIsOnChange, style, ...props }: ToggleProps): import("react").JSX.Element;
//# sourceMappingURL=Toggle.linux.d.ts.map