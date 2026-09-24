import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    onNativeReservedRegionsChange?: DirectEventHandler<Readonly<{
        regions: {
            id: string;
            kind: string;
            x: Double;
            y: Double;
            width: Double;
            height: Double;
            marginTop: Double;
            marginLeft: Double;
            marginBottom: Double;
            marginRight: Double;
            isActive: boolean;
        }[];
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeReservedRegionsProviderNativeComponent.d.ts.map