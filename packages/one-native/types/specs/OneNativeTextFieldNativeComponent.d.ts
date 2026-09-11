import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    value: string;
    acknowledgedEvent: Int32;
    revision: Int32;
    label: string;
    disabled: boolean;
    prompt: string;
    textFieldStyle: string;
    submitLabel: string;
    textInputAutocapitalization: string;
    autocorrectionDisabled: boolean;
    axis: string;
    onNativeTextFieldValueChange?: DirectEventHandler<Readonly<{
        value: string;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeTextFieldSubmit?: DirectEventHandler<Readonly<{
        eventCount: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeTextFieldNativeComponent.d.ts.map