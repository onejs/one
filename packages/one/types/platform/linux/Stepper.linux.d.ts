import type { ViewProps } from 'react-native';
export type StepperProps = Omit<ViewProps, 'children'> & {
    value: number;
    minimumValue?: number;
    maximumValue?: number;
    /** increment, in the stepper's value units. */
    step?: number;
    disabled?: boolean;
    revision?: number;
    onValueChange?: (event: {
        value: number;
        revision: number;
    }) => void;
};
export declare function Stepper({ value, minimumValue, maximumValue, step, revision, onValueChange, style, ...props }: StepperProps): import("react").JSX.Element;
//# sourceMappingURL=Stepper.linux.d.ts.map