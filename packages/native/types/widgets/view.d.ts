import { type ComponentType, type ReactNode } from 'react';
export type WidgetStyle = {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
    padding?: number;
    borderRadius?: number;
    spacing?: number;
};
type WidgetProps = {
    children?: ReactNode;
    style?: WidgetStyle;
};
export declare const WidgetUI: Readonly<{
    Text: ComponentType<WidgetProps>;
    VStack: ComponentType<WidgetProps>;
    HStack: ComponentType<WidgetProps>;
    Spacer: ComponentType<Omit<WidgetProps, 'children'>>;
}>;
export type ActivityView = {
    lockScreen: ReactNode;
    compactLeading?: ReactNode;
    compactTrailing?: ReactNode;
    minimal?: ReactNode;
};
export declare function encodeWidgetView(view: ReactNode): string;
export declare function encodeActivityView(view: ActivityView): string;
export {};
//# sourceMappingURL=view.d.ts.map