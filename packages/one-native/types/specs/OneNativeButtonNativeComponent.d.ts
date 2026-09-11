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
    label: string;
    disabled: boolean;
    systemImage: string;
    buttonRole: string;
    buttonStyle: string;
    swiftStyle?: OneNativeStyleNative;
    onNativeButtonPress?: DirectEventHandler<Readonly<{
        eventCount: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeButtonNativeComponent.d.ts.map