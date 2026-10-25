import type { ControlledControlProps, ControlChange } from '../controlTypes';
export type ToggleProps = ControlledControlProps & {
    label: string;
    isOn: boolean;
    onIsOnChange?: (event: ControlChange<{
        isOn: boolean;
    }>) => void;
};
export declare function Toggle({ label, isOn, revision, onIsOnChange, style, ...props }: ToggleProps): import("react").JSX.Element;
//# sourceMappingURL=Toggle.linux.d.ts.map