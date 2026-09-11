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
    label: string;
    disabled: boolean;
    prompt: string;
    textFieldStyle: string;
    submitLabel: string;
    textInputAutocapitalization: string;
    autocorrectionDisabled: boolean;
    swiftStyle?: OneNativeStyleNative;
    onNativeSecureFieldValueChange?: DirectEventHandler<Readonly<{
        value: string;
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