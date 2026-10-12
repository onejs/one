import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    onNativeGeometryReaderChange?: DirectEventHandler<Readonly<{
        x: Double;
        y: Double;
        width: Double;
        height: Double;
        safeAreaTop: Double;
        safeAreaLeading: Double;
        safeAreaBottom: Double;
        safeAreaTrailing: Double;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeGeometryReaderNativeComponent.d.ts.map