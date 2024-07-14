import { type ViewProps } from 'react-native';
export type PageLoadProgressBarProps = ViewProps & {
    finishDelay?: number;
    initialPercent?: number;
    updateInterval?: number;
    sporadicness?: number;
};
export declare const PageLoadProgressBar: ({ finishDelay, initialPercent, updateInterval, sporadicness, ...props }: PageLoadProgressBarProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PageLoadProgressBar.d.ts.map