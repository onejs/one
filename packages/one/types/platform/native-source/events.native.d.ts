import type { NativeSourceStructs, NativeSourceWire } from './wire.native';
export declare function subscribeNativeSourceEvent(module: string, event: string, listener: (...args: never[]) => void, contractHash: string, payloadWires: (NativeSourceWire | null)[], structs: NativeSourceStructs): () => void;
//# sourceMappingURL=events.native.d.ts.map