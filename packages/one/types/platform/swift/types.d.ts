import type { NativeSourceViewWires } from '../native-source/wire.native';
export interface SwiftPackageViewProps {
    packageName: string;
    view: string;
    contractHash: string;
    props: Record<string, unknown>;
    fill: boolean;
    wires?: NativeSourceViewWires;
}
//# sourceMappingURL=types.d.ts.map