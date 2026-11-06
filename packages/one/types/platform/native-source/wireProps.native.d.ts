import { type NativeSourceViewWires } from './wire.native';
export declare const RESYNC_EVENT = "$resync";
interface Sent {
    seq: number;
    text: string;
    lists: Record<string, unknown[]>;
    texts: Record<string, string>;
}
export declare function nextDocument(props: Record<string, unknown>, wires: NativeSourceViewWires | undefined, prev: Sent | null, full: boolean): Sent | null;
export declare function useNativeSourceProps(props: Record<string, unknown>, wires: NativeSourceViewWires | undefined, keyed: boolean): {
    text: string;
    resync: () => void;
};
export {};
//# sourceMappingURL=wireProps.native.d.ts.map