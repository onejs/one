import type { ControlledControlProps } from '../controlTypes';
export type StepperProps = ControlledControlProps & {
    value: number;
    label?: string;
    in?: readonly [number, number];
    /** increment, in the stepper's value units. */
    step?: number;
    onValueChange: (value: number) => void;
};
export declare function Stepper({ value, label, in: [minimumValue, maximumValue], step, revision, onValueChange, style, ...props }: StepperProps): import("react").JSX.Element;
//# sourceMappingURL=Stepper.linux.d.ts.map