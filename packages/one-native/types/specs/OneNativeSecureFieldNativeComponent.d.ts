import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    value: string;
    acknowledgedEvent: Int32;
    revision: Int32;
    focused: boolean;
    acknowledgedFocusEvent: Int32;
    focusRevision: Int32;
    label: string;
    disabled: boolean;
    prompt: string;
    textFieldStyle: string;
    submitLabel: string;
    textInputAutocapitalization: string;
    autocorrectionDisabled: boolean;
    keyboardType: string;
    textContentType: string;
    onNativeSecureFieldValueChange?: DirectEventHandler<Readonly<{
        value: string;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeSecureFieldFocusChange?: DirectEventHandler<Readonly<{
        value: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeSecureFieldSubmit?: DirectEventHandler<Readonly<{
        eventCount: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeSecureFieldNativeComponent.d.ts.map