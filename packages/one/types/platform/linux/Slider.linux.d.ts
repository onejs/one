import type { ControlledControlProps, ControlChange } from '../controlTypes';
export type SliderProps = ControlledControlProps & {
    value: number;
    minimumValue?: number;
    maximumValue?: number;
    /** keyboard increment, in the slider's value units. */
    step?: number;
    onValueChange?: (event: ControlChange<{
        value: number;
    }>) => void;
    onSlidingStart?: (event: ControlChange<{
        value: number;
    }>) => void;
    onSlidingComplete?: (event: ControlChange<{
        value: number;
    }>) => void;
};
export declare function Slider({ value, minimumValue, maximumValue, step, revision, onValueChange, onSlidingStart, onSlidingComplete, style, ...props }: SliderProps): import("react").JSX.Element;
//# sourceMappingURL=Slider.linux.d.ts.map