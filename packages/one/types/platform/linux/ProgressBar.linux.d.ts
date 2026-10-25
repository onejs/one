import type { ViewProps } from 'react-native';
export type ProgressBarProps = Omit<ViewProps, 'children'> & {
    value?: number;
    indeterminate?: boolean;
};
export declare function ProgressBar({ value, indeterminate, style, ...props }: ProgressBarProps): import("react").JSX.Element;
//# sourceMappingURL=ProgressBar.linux.d.ts.map