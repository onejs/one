import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import type { OneNativeStyle } from './generated/controlTypes';
import { type HingeState } from './adaptive/index.native';
export type ArrangementViewStyle = 'automatic' | 'split' | 'overlay' | {
    kind: 'automatic';
} | {
    kind: 'split';
    axes?: ('horizontal' | 'vertical')[] | 'horizontal' | 'vertical' | 'both';
} | {
    kind: 'overlay';
    axes?: ('horizontal' | 'vertical')[] | 'horizontal' | 'vertical' | 'both';
};
export type SplitLayoutRatio = number | {
    minHorizontal?: number;
    idealHorizontal?: number;
    maxHorizontal?: number;
    minVertical?: number;
    idealVertical?: number;
    maxVertical?: number;
};
export interface SplitLayoutSize {
    minWidth?: number;
    idealWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    idealHeight?: number;
    maxHeight?: number;
}
export type SplitFixedLayoutSize = boolean | {
    horizontal?: boolean;
    vertical?: boolean;
};
export type OverlayArrangementEdge = 'top' | 'bottom';
export interface ArrangementPaneProps {
    children?: ReactNode;
    splitArrangementLayoutRatio?: SplitLayoutRatio;
    splitArrangementLayoutSize?: SplitLayoutSize;
    splitArrangementFixedLayoutSize?: SplitFixedLayoutSize;
    overlayArrangementEdge?: OverlayArrangementEdge;
    testID?: string;
}
export declare function ArrangementPrimary(_props: ArrangementPaneProps): never;
export declare function ArrangementSecondary(_props: ArrangementPaneProps): never;
export interface ArrangementViewProps {
    children?: ReactNode;
    primary?: ReactNode;
    secondary?: ReactNode;
    leading?: ReactNode;
    detail?: ReactNode;
    arrangementViewStyle?: ArrangementViewStyle;
    splitArrangementLayoutRatio?: SplitLayoutRatio;
    splitArrangementLayoutSize?: SplitLayoutSize;
    splitArrangementFixedLayoutSize?: SplitFixedLayoutSize;
    overlayArrangementEdge?: OverlayArrangementEdge;
    swiftStyle?: OneNativeStyle;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    onHingeChange?: (hinge: HingeState | null) => void;
}
export declare function ArrangementViewComponent({ children, primary, secondary, leading, detail, arrangementViewStyle, splitArrangementLayoutRatio, splitArrangementLayoutSize, splitArrangementFixedLayoutSize, overlayArrangementEdge, swiftStyle, style, testID, onHingeChange: onHingeChangeProp, ...props }: ArrangementViewProps): import("react/jsx-runtime").JSX.Element;
export declare const ArrangementView: typeof ArrangementViewComponent & {
    Primary: typeof ArrangementPrimary;
    Secondary: typeof ArrangementSecondary;
    Leading: typeof ArrangementPrimary;
    Detail: typeof ArrangementSecondary;
};
//# sourceMappingURL=ArrangementView.native.d.ts.map