import type { ColorValue } from 'react-native';
export type ChartType = 'line' | 'point' | 'bar' | 'area' | 'pie' | 'rectangle';
export type ChartPointStyle = 'circle' | 'square' | 'diamond';
export type ChartDataPoint = Readonly<{
    x: string | number;
    y: number;
    color?: ColorValue;
}>;
export type LineChartStyle = Readonly<{
    dashArray?: readonly number[];
    width?: number;
    pointStyle?: ChartPointStyle;
    pointSize?: number;
    color?: ColorValue;
}>;
export type AreaChartStyle = Readonly<{
    color?: ColorValue;
}>;
export type BarChartStyle = Readonly<{
    cornerRadius?: number;
    width?: number;
}>;
export type PieChartStyle = Readonly<{
    innerRadius?: number;
    angularInset?: number;
}>;
export type PointChartStyle = Readonly<{
    pointStyle?: ChartPointStyle;
    pointSize?: number;
}>;
export type RectangleChartStyle = Readonly<{
    color?: ColorValue;
    cornerRadius?: number;
}>;
export type RuleChartStyle = Readonly<{
    color?: ColorValue;
    lineWidth?: number;
    dashArray?: readonly number[];
}>;
//# sourceMappingURL=chartTypes.d.ts.map