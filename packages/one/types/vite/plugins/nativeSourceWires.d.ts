export interface WireStructField {
    name: string;
    optional: boolean;
    wire?: unknown;
}
export interface WireStruct {
    name: string;
    fields: WireStructField[];
}
export declare function toNativeSourceStructs(structs: WireStruct[]): Record<string, {
    fields: {
        name: string;
        optional: boolean;
        wire?: unknown;
    }[];
}>;
export interface WireMethodParam {
    wire?: unknown;
}
export interface WireMethod {
    name: string;
    parameters: (WireMethodParam & {
        name: string;
    })[];
    resultWire?: unknown;
}
export interface WireViewProp {
    name: string;
    wire?: unknown;
    callback: {
        wire?: unknown;
    }[] | null;
}
export interface WireView {
    props: WireViewProp[];
}
export declare function methodWired(method: {
    parameters: {
        wire?: unknown;
    }[];
    resultWire?: unknown;
}): boolean;
export declare function methodSubscribed(method: {
    subscription?: unknown;
}): boolean;
export declare function renderMethodCall(target: string, method: {
    name: string;
    parameters: {
        name: string;
        wire?: unknown;
    }[];
    resultWire?: unknown;
    subscription?: unknown;
}, hash: string): string;
export declare function renderViewWires(view: WireView, structs: WireStruct[]): string;
//# sourceMappingURL=nativeSourceWires.d.ts.map