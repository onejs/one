import type { ViewProps } from 'react-native';
export type StepperProps = Omit<ViewProps, 'children'> & {
    value: number;
    label?: string;
    in?: readonly [number, number];
    /** increment, in the stepper's value units. */
    step?: number;
    disabled?: boolean;
    revision?: number;
    onValueChange: (value: number) => void;
};
export declare function Stepper({ value, label, in: [minimumValue, maximumValue], step, revision, onValueChange, style, ...props }: StepperProps): import("react").JSX.Element;
//# sourceMappingURL=Stepper.linux.d.ts.map