import type { ViewProps } from 'react-native';
import type { Float, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    material?: WithDefault<string, 'sidebar'>;
    blending?: WithDefault<string, 'behindWindow'>;
    cornerRadius?: WithDefault<Float, 0>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneMacMaterialNativeComponent.d.ts.map