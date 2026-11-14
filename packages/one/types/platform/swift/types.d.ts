import type { StyleProp, ViewStyle } from 'react-native';
import type { NativeSourceViewWires } from '../native-source/wire.native.js';
export interface SwiftPackageViewProps {
    packageName: string;
    view: string;
    contractHash: string;
    props: Record<string, unknown> & {
        style?: StyleProp<ViewStyle>;
    };
    fill: boolean;
    wires?: NativeSourceViewWires;
}
//# sourceMappingURL=types.d.ts.map