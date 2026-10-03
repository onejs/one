import type { ViewProps } from 'react-native';
import type { Double, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
interface NativeProps extends ViewProps {
    placement: string;
    splitRatio?: WithDefault<Double, -1>;
    splitMinHorizontal?: WithDefault<Double, -1>;
    splitIdealHorizontal?: WithDefault<Double, -1>;
    splitMaxHorizontal?: WithDefault<Double, -1>;
    splitMinVertical?: WithDefault<Double, -1>;
    splitIdealVertical?: WithDefault<Double, -1>;
    splitMaxVertical?: WithDefault<Double, -1>;
    splitMinWidth?: WithDefault<Double, -1>;
    splitIdealWidth?: WithDefault<Double, -1>;
    splitMaxWidth?: WithDefault<Double, -1>;
    splitMinHeight?: WithDefault<Double, -1>;
    splitIdealHeight?: WithDefault<Double, -1>;
    splitMaxHeight?: WithDefault<Double, -1>;
    splitFixedHorizontal?: boolean;
    splitFixedVertical?: boolean;
    overlayEdge?: string;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeArrangementSlotNativeComponent.d.ts.map