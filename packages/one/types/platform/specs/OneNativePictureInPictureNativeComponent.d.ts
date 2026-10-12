import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    active: boolean;
    autoEnter: boolean;
    onNativePictureInPictureChange?: DirectEventHandler<Readonly<{
        active: boolean;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativePictureInPictureNativeComponent.d.ts.map