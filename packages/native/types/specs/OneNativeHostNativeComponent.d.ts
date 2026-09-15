import type { ColorValue, ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    axis: string;
    spacing: Double;
    alignment: string;
    colorScheme: string;
    dynamicTypeSize: string;
    locale: string;
    tint?: ColorValue;
    isEnabled: string;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeHostNativeComponent.d.ts.map