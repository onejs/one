import type { StyleProp, ViewStyle } from 'react-native';
import type { NativeSourceViewWires } from './wire.native';
export interface KotlinSourceViewProps {
    source: string;
    view: string;
    contractHash: string;
    props: Record<string, unknown> & {
        style?: StyleProp<ViewStyle>;
    };
    wires?: NativeSourceViewWires;
}
//# sourceMappingURL=viewTypes.d.ts.map