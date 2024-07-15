import { type ViewProps } from 'react-native';
export type PageLoadProgressBarProps = {
    startDelay?: number;
    finishDelay?: number;
    initialPercent?: number;
    updateInterval?: number;
    sporadicness?: number;
} & Pick<ViewProps, 'style' | 'onLayout' | 'children'>;
export declare const PageLoadProgressBar: ({ startDelay, finishDelay, initialPercent, updateInterval, sporadicness, ...props }: PageLoadProgressBarProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PageLoadProgressBar.d.ts.map