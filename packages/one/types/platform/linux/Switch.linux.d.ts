import type { ControlledControlProps, ControlChange } from '../controlTypes';
export type SwitchProps = ControlledControlProps & {
    isOn: boolean;
    onIsOnChange?: (event: ControlChange<{
        isOn: boolean;
    }>) => void;
};
export declare function Switch({ isOn, revision, onIsOnChange, ...props }: SwitchProps): import("react").JSX.Element;
//# sourceMappingURL=Switch.linux.d.ts.map