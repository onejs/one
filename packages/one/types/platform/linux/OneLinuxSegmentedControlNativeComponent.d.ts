import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export type ChangeEvent = Readonly<{
    value: Double;
    revision: Int32;
    eventCount: Int32;
}>;
interface NativeProps extends ViewProps {
    labels: ReadonlyArray<string>;
    value: Double;
    disabled?: boolean;
    revision: Int32;
    acknowledgedEvent: Int32;
    onControlChange?: DirectEventHandler<ChangeEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneLinuxSegmentedControlNativeComponent.d.ts.map