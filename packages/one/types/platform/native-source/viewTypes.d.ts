import type { StyleProp, ViewStyle } from 'react-native';
export interface KotlinSourceViewProps {
    source: string;
    view: string;
    contractHash: string;
    props: Record<string, unknown> & {
        style?: StyleProp<ViewStyle>;
    };
}
//# sourceMappingURL=viewTypes.d.ts.map