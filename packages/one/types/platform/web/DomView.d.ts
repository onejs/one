import { type CSSProperties, type ReactNode } from 'react';
import type { ImageStyle, StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';
export declare const VIEW_BASE: CSSProperties;
export declare function domStyle(style: StyleProp<ViewStyle | TextStyle | ImageStyle>): CSSProperties;
export type DomViewProps = Pick<ViewProps, 'testID' | 'nativeID' | 'onLayout' | 'accessibilityLabel' | 'style'> & {
    children?: ReactNode;
    baseStyle?: CSSProperties;
};
export declare function DomView({ testID, nativeID, onLayout, accessibilityLabel, style, baseStyle, children, }: DomViewProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=DomView.d.ts.map