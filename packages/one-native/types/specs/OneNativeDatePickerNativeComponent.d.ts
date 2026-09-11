import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    value: Double;
    acknowledgedEvent: Int32;
    revision: Int32;
    label: string;
    disabled: boolean;
    minimumDate: Double;
    maximumDate: Double;
    displayedComponents: string;
    datePickerStyle: string;
    onNativeDatePickerValueChange?: DirectEventHandler<Readonly<{
        value: Double;
        eventCount: Int32;
        revision: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeDatePickerNativeComponent.d.ts.map