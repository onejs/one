import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    alignment: string;
    slotName: string;
    slotValues: string;
    onNativeSDKEvent?: DirectEventHandler<Readonly<{
        name: string;
        value: string;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeOverlayNativeComponent.d.ts.map