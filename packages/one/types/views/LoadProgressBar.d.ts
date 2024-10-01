import { type ViewProps } from 'react-native';
export type LoadProgressBarProps = {
    /** How long after a navigation to wait before showing the progress bar (in ms) */
    startDelay?: number;
    /** How long after a navigation completes to wait before hiding the progress bar (in ms) */
    finishDelay?: number;
    /** The starting percent it should show the loading state at */
    initialPercent?: number;
    /** How often the progress bar should update (in ms) */
    updateInterval?: number;
    /** How often to skip an update (checked each during the loop) */
    sporadicness?: number;
    /** Pass style to the inner View */
    style?: ViewProps['style'];
    /** Pass onLayout to the inner View */
    onLayout?: ViewProps['onLayout'];
    /** Pass children to the inner View */
    children?: ViewProps['children'];
};
export declare const LoadProgressBar: ({ startDelay, finishDelay, initialPercent, updateInterval, sporadicness, ...props }: LoadProgressBarProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LoadProgressBar.d.ts.map