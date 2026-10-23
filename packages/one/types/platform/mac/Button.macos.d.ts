import type { ViewProps } from 'react-native';
export type ButtonProps = Omit<ViewProps, 'children'> & {
    title: string;
    /** sf symbol name, such as sidebar.left or plus. */
    systemImage?: string;
    disabled?: boolean;
    onPress?: () => void;
};
export declare function Button({ onPress, ...props }: ButtonProps): import("react").JSX.Element;
//# sourceMappingURL=Button.macos.d.ts.map