import type { ControlledControlProps } from '../controlTypes';
export type ButtonProps = ControlledControlProps & {
    title: string;
    onPress?: () => void;
};
export declare function Button({ revision, onPress, style, ...props }: ButtonProps): import("react").JSX.Element;
//# sourceMappingURL=Button.linux.d.ts.map