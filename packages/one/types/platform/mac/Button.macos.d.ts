import type { ViewProps } from 'react-native';
export type ButtonProps = Omit<ViewProps, 'children'> & {
    title: string;
    /** sf symbol name, such as sidebar.left or plus. */
    systemImage?: string;
    disabled?: boolean;
    /** draws the rounded push button bezel; false keeps only the title and symbol. defaults to true. */
    bordered?: boolean;
    onPress?: () => void;
};
export declare function Button({ onPress, ...props }: ButtonProps): import("react").JSX.Element;
//# sourceMappingURL=Button.macos.d.ts.map