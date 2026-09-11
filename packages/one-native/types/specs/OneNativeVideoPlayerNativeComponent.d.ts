import type { ColorValue, ViewProps } from 'react-native';
import type { Double, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
type OneNativeStyleNative = Readonly<{
    fontSize?: WithDefault<Double, -1>;
    fontWeight?: string;
    fontDesign?: string;
    textStyle?: string;
    foregroundStyle?: ColorValue;
    tint?: ColorValue;
    background?: ColorValue;
    padding?: WithDefault<Double, -1>;
    paddingTop?: WithDefault<Double, -1>;
    paddingLeading?: WithDefault<Double, -1>;
    paddingBottom?: WithDefault<Double, -1>;
    paddingTrailing?: WithDefault<Double, -1>;
    width?: WithDefault<Double, -1>;
    height?: WithDefault<Double, -1>;
    minWidth?: WithDefault<Double, -1>;
    idealWidth?: WithDefault<Double, -1>;
    maxWidth?: WithDefault<Double, -1>;
    minHeight?: WithDefault<Double, -1>;
    idealHeight?: WithDefault<Double, -1>;
    maxHeight?: WithDefault<Double, -1>;
    cornerRadius?: WithDefault<Double, -1>;
    opacity?: WithDefault<Double, -1>;
    borderColor?: ColorValue;
    borderWidth?: WithDefault<Double, -1>;
}>;
interface NativeProps extends ViewProps {
    url: string;
    autoplay: boolean;
    swiftStyle?: OneNativeStyleNative;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeVideoPlayerNativeComponent.d.ts.map