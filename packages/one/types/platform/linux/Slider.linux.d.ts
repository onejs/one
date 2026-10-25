import type { ViewProps } from 'react-native';
export type SliderProps = Omit<ViewProps, 'children'> & {
    value: number;
    minimumValue?: number;
    maximumValue?: number;
    /** keyboard increment, in the slider's value units. */
    step?: number;
    disabled?: boolean;
    revision?: number;
    onValueChange?: (event: {
        value: number;
        revision: number;
    }) => void;
};
export declare function Slider({ value, minimumValue, maximumValue, step, revision, onValueChange, style, ...props }: SliderProps): import("react").JSX.Element;
//# sourceMappingURL=Slider.linux.d.ts.map