import type { ViewProps } from 'react-native';
export type SwitchProps = Omit<ViewProps, 'children'> & {
    isOn: boolean;
    revision?: number;
    onIsOnChange?: (event: {
        isOn: boolean;
        revision: number;
    }) => void;
};
export declare function Switch({ isOn, revision, onIsOnChange, ...props }: SwitchProps): import("react").JSX.Element;
//# sourceMappingURL=Switch.linux.d.ts.map