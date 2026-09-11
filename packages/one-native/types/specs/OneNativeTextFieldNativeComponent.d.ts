import type { ColorValue, ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double } from 'react-native/Libraries/Types/CodegenTypes';
type OneNativeStyleNative = Readonly<{
    fontSize?: Double;
    fontWeight?: string;
    fontDesign?: string;
    textStyle?: string;
    foregroundStyle?: ColorValue;
    tint?: ColorValue;
    background?: ColorValue;
    padding?: Double;
    paddingTop?: Double;
    paddingLeading?: Double;
    paddingBottom?: Double;
    paddingTrailing?: Double;
    width?: Double;
    height?: Double;
    minWidth?: Double;
    idealWidth?: Double;
    maxWidth?: Double;
    minHeight?: Double;
    idealHeight?: Double;
    maxHeight?: Double;
    cornerRadius?: Double;
    opacity?: Double;
    borderColor?: ColorValue;
    borderWidth?: Double;
}>;
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
    axis: string;
    swiftStyle?: OneNativeStyleNative;
    onNativeTextFieldValueChange?: DirectEventHandler<Readonly<{
        value: string;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeTextFieldFocusChange?: DirectEventHandler<Readonly<{
        value: boolean;
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