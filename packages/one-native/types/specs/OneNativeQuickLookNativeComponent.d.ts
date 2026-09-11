import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    value: boolean;
    acknowledgedEvent: Int32;
    revision: Int32;
    url: string;
    onNativeQuickLookValueChange?: DirectEventHandler<Readonly<{
        value: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeQuickLookNativeComponent.d.ts.map