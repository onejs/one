export interface NativeSourceWireField {
    name: string;
    optional: boolean;
    wire?: NativeSourceWire;
}
export type NativeSourceWire = {
    kind: 'date';
} | {
    kind: 'data';
} | {
    kind: 'struct';
    name: string;
} | {
    kind: 'enum';
    name: string;
} | {
    kind: 'array';
    element: NativeSourceWire;
} | {
    kind: 'map';
    value: NativeSourceWire;
} | {
    kind: 'nullable';
    inner: NativeSourceWire;
};
export type NativeSourceStructs = Record<string, {
    fields: NativeSourceWireField[];
}>;
export interface NativeSourceViewWires {
    props: Record<string, NativeSourceWire>;
    callbacks: Record<string, (NativeSourceWire | null)[]>;
    structs: NativeSourceStructs;
}
export declare function base64Encode(bytes: Uint8Array): string;
export declare function base64Decode(text: string): Uint8Array;
export declare function encodeNativeSourceArgs(args: unknown[], wires: (NativeSourceWire | null | undefined)[], structs: NativeSourceStructs): unknown[];
export declare function decodeNativeSourceResult(value: unknown, wire: NativeSourceWire | null | undefined, structs: NativeSourceStructs): unknown;
export declare function encodeNativeSourceProps(props: Record<string, unknown>, wires: Record<string, NativeSourceWire>, structs: NativeSourceStructs): Record<string, unknown>;
export declare function decodeNativeSourceCallback(args: unknown[], wires: (NativeSourceWire | null | undefined)[], structs: NativeSourceStructs, event: string): unknown[];
//# sourceMappingURL=wire.native.d.ts.map