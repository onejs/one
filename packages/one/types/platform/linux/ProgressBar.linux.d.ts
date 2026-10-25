import type { ViewProps } from 'react-native';
export type ProgressBarProps = Omit<ViewProps, 'children'> & {
    value: number;
    revision?: number;
};
export declare function ProgressBar({ value, revision, style, ...props }: ProgressBarProps): import("react").JSX.Element;
//# sourceMappingURL=ProgressBar.linux.d.ts.map