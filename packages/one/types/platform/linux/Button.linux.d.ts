import type { ViewProps } from 'react-native';
export type ButtonProps = Omit<ViewProps, 'children'> & {
    title: string;
    disabled?: boolean;
    revision?: number;
    onPress?: () => void;
};
export declare function Button({ revision, onPress, style, ...props }: ButtonProps): import("react").JSX.Element;
//# sourceMappingURL=Button.linux.d.ts.map