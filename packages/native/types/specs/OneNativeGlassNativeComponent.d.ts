import type { ColorValue, ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    material?: string;
    glassEffect?: string;
    interactive?: boolean;
    shape?: string;
    cornerRadius?: Double;
    tint?: ColorValue;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeGlassNativeComponent.d.ts.map