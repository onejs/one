import { type ProcessedColorValue } from 'react-native';
import type { OneNativeStyle } from './controlTypes';
export type OneNativeStyleNative = Readonly<{
    fontSize?: number;
    fontWeight?: string;
    fontDesign?: string;
    textStyle?: string;
    foregroundStyle?: ProcessedColorValue;
    tint?: ProcessedColorValue;
    background?: ProcessedColorValue;
    padding?: number;
    paddingTop?: number;
    paddingLeading?: number;
    paddingBottom?: number;
    paddingTrailing?: number;
    width?: number;
    height?: number;
    minWidth?: number;
    idealWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    idealHeight?: number;
    maxHeight?: number;
    cornerRadius?: number;
    opacity?: number;
    borderColor?: ProcessedColorValue;
    borderWidth?: number;
    glassEffect?: string;
    glassEffectInteractive?: boolean;
    glassEffectTint?: ProcessedColorValue;
    glassEffectShape?: string;
    material?: string;
    sdkModifiers?: string;
}>;
export type SDKEventValueShape = {
    kind: 'number' | 'string' | 'boolean' | 'point' | 'size' | 'description';
} | {
    kind: 'enum';
    cases: readonly string[];
    open?: true;
} | {
    kind: 'optional' | 'array';
    value: SDKEventValueShape;
} | {
    kind: 'object';
    fields: readonly {
        name: string;
        value: SDKEventValueShape;
    }[];
} | {
    kind: 'result';
    value: SDKEventValueShape;
} | {
    kind: 'verification';
} | {
    kind: 'associatedEnum';
    cases: readonly {
        name: string;
        values: readonly SDKEventValueShape[];
    }[];
    open?: true;
};
export declare function validSDKEventValue(value: unknown, shape: SDKEventValueShape): boolean;
export declare function swiftStyleNative(style: OneNativeStyle | undefined): OneNativeStyleNative | undefined;
export declare function dispatchSDKEvent(style: OneNativeStyle | undefined, name: string, value: string): void;
//# sourceMappingURL=swiftStyleNative.d.ts.map