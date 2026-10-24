import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export type ChangeEvent = Readonly<{
    isOn: boolean;
    revision: Int32;
    eventCount: Int32;
}>;
interface NativeProps extends ViewProps {
    isOn: boolean;
    revision: Int32;
    acknowledgedEvent: Int32;
    onIsOnChange?: DirectEventHandler<ChangeEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneLinuxSwitchNativeComponent.d.ts.map