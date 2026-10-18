import { type ColorValue, type ViewProps } from 'react-native';
import type { OneNativeStyle } from './generated/controlTypes';
import { type UnitPoint } from './listTypes';
export interface CanvasPoint {
    x: number;
    y: number;
}
export interface CanvasSize {
    width: number;
    height: number;
}
export interface CanvasRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare class Angle {
    readonly radians: number;
    private constructor();
    static radians(radians: number): Angle;
    static degrees(degrees: number): Angle;
    get degrees(): number;
}
export declare const roundedCornerStyles: readonly ['circular', 'continuous'];
export type RoundedCornerStyle = (typeof roundedCornerStyles)[number];
type PathElement = {
    t: 'move';
    x: number;
    y: number;
} | {
    t: 'line';
    x: number;
    y: number;
} | {
    t: 'quad';
    x: number;
    y: number;
    cx: number;
    cy: number;
} | {
    t: 'curve';
    x: number;
    y: number;
    c1x: number;
    c1y: number;
    c2x: number;
    c2y: number;
} | {
    t: 'arc';
    cx: number;
    cy: number;
    r: number;
    start: number;
    end: number;
    clockwise: boolean;
} | {
    t: 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
} | {
    t: 'roundedRect';
    x: number;
    y: number;
    w: number;
    h: number;
    cw: number;
    ch: number;
    style: RoundedCornerStyle;
} | {
    t: 'ellipse';
    x: number;
    y: number;
    w: number;
    h: number;
} | {
    t: 'close';
};
export declare class Path {
    readonly elements: PathElement[];
    private hasCurrentPoint;
    constructor(build?: (path: Path) => void);
    static rect(rect_: CanvasRect): Path;
    static ellipse(rect_: CanvasRect): Path;
    static roundedRect(rect_: CanvasRect, cornerRadius: number, style?: RoundedCornerStyle): Path;
    move(to: CanvasPoint): void;
    addLine(to: CanvasPoint): void;
    addQuadCurve(to: CanvasPoint, control: CanvasPoint): void;
    addCurve(to: CanvasPoint, control1: CanvasPoint, control2: CanvasPoint): void;
    addArc(center: CanvasPoint, radius: number, startAngle: Angle, endAngle: Angle, clockwise: boolean): void;
    addRect(rect_: CanvasRect): void;
    addRoundedRect(rect_: CanvasRect, cornerSize: CanvasSize, style?: RoundedCornerStyle): void;
    addEllipse(rect_: CanvasRect): void;
    closeSubpath(): void;
    private requireCurrentPoint;
}
export interface GradientStop {
    color: ColorValue;
    location: number;
}
export interface Gradient {
    stops: readonly GradientStop[];
}
export declare function Gradient(input: readonly ColorValue[] | {
    stops: readonly GradientStop[];
}): Gradient;
type ShadingValue = {
    kind: 'color';
    color: ColorValue;
} | {
    kind: 'linearGradient';
    gradient: Gradient;
    startPoint: CanvasPoint;
    endPoint: CanvasPoint;
} | {
    kind: 'radialGradient';
    gradient: Gradient;
    center: CanvasPoint;
    startRadius: number;
    endRadius: number;
} | {
    kind: 'conicGradient';
    gradient: Gradient;
    center: CanvasPoint;
    angle: Angle;
};
export declare const Shading: {
    color(color: ColorValue): ShadingValue;
    linearGradient(gradient: Gradient, startPoint: CanvasPoint, endPoint: CanvasPoint): ShadingValue;
    radialGradient(gradient: Gradient, center: CanvasPoint, startRadius: number, endRadius: number): ShadingValue;
    conicGradient(gradient: Gradient, center: CanvasPoint, angle_?: Angle): ShadingValue;
};
export type Shading = ShadingValue;
export interface FillStyle {
    eoFill?: boolean;
    antialiased?: boolean;
}
export declare const lineCaps: readonly ['butt', 'round', 'square'];
export declare const lineJoins: readonly ['miter', 'round', 'bevel'];
export interface StrokeStyle {
    lineWidth?: number;
    lineCap?: (typeof lineCaps)[number];
    lineJoin?: (typeof lineJoins)[number];
    miterLimit?: number;
    dash?: readonly number[];
    dashPhase?: number;
}
export declare const canvasFontWeights: readonly ['ultraLight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black'];
export interface CanvasText {
    text: string;
    fontSize?: number;
    fontWeight?: (typeof canvasFontWeights)[number];
    color?: ColorValue;
}
export interface CanvasSymbol {
    systemName: string;
    color?: ColorValue;
}
export declare const blendModes: readonly ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'colorDodge', 'colorBurn', 'softLight', 'hardLight', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'clear', 'copy', 'sourceIn', 'sourceOut', 'sourceAtop', 'destinationOver', 'destinationIn', 'destinationOut', 'destinationAtop', 'xor', 'plusDarker', 'plusLighter'];
export type BlendMode = (typeof blendModes)[number];
type DrawPlacement = {
    at: CanvasPoint;
    anchor?: UnitPoint;
} | {
    in: CanvasRect;
};
export interface GraphicsContext {
    fill(path: Path, shading: Shading, style?: FillStyle): void;
    stroke(path: Path, shading: Shading, style?: number | StrokeStyle): void;
    draw(item: CanvasText | CanvasSymbol, placement: DrawPlacement): void;
    clip(path: Path, style?: FillStyle): void;
    translateBy(x: number, y: number): void;
    scaleBy(x: number, y: number): void;
    rotate(by: Angle): void;
    opacity: number;
    blendMode: BlendMode;
    drawLayer(draw: (context: GraphicsContext) => void): void;
}
export declare function recordCanvas(draw: (context: GraphicsContext, size: CanvasSize) => void, size: CanvasSize): string;
export declare const canvasColorModes: readonly ['nonLinear', 'linear', 'extendedLinear'];
export type CanvasColorMode = (typeof canvasColorModes)[number];
export interface CanvasProps extends Omit<ViewProps, 'children'> {
    swiftStyle?: OneNativeStyle;
    opaque?: boolean;
    colorMode?: CanvasColorMode;
    rendersAsynchronously?: boolean;
    children: (context: GraphicsContext, size: CanvasSize) => void;
}
export {};
//# sourceMappingURL=canvas.d.ts.map