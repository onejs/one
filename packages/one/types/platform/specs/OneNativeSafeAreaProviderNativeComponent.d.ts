import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    onNativeInsetsChange?: DirectEventHandler<Readonly<{
        insetTop: Double;
        insetRight: Double;
        insetBottom: Double;
        insetLeft: Double;
        frameX: Double;
        frameY: Double;
        frameWidth: Double;
        frameHeight: Double;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeSafeAreaProviderNativeComponent.d.ts.map