import { type ComponentType, type ReactNode } from 'react';
export type WidgetStyle = {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
    fontDesign?: 'default' | 'rounded' | 'serif' | 'monospaced';
    padding?: number;
    borderRadius?: number;
    spacing?: number;
    width?: number;
    height?: number;
    opacity?: number;
    lineLimit?: number;
    alignment?: 'leading' | 'center' | 'trailing';
};
type WidgetProps = {
    children?: ReactNode;
    style?: WidgetStyle;
};
type ImageProps = Omit<WidgetProps, 'children'> & {
    systemName: string;
};
type ProgressProps = Omit<WidgetProps, 'children'> & {
    value: number;
    total?: number;
};
type ShapeProps = Omit<WidgetProps, 'children'> & {
    fill?: string;
    cornerRadius?: number;
};
type LinkProps = WidgetProps & {
    url: string;
};
export declare const WidgetUI: Readonly<{
    Text: ComponentType<WidgetProps>;
    VStack: ComponentType<WidgetProps>;
    HStack: ComponentType<WidgetProps>;
    ZStack: ComponentType<WidgetProps>;
    Spacer: ComponentType<Omit<WidgetProps, 'children'>>;
    Divider: ComponentType<Omit<WidgetProps, 'children'>>;
    Image: ComponentType<ImageProps>;
    Progress: ComponentType<ProgressProps>;
    Gauge: ComponentType<ProgressProps>;
    Circle: ComponentType<ShapeProps>;
    Rectangle: ComponentType<ShapeProps>;
    RoundedRectangle: ComponentType<ShapeProps>;
    Link: ComponentType<LinkProps>;
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