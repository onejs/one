import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes';
type KotlinHostEvent = Readonly<{
    name: string;
    args: string;
}>;
type KotlinHostSizeEvent = Readonly<{
    width: Double;
    height: Double;
}>;
interface NativeProps extends ViewProps {
    source: string;
    view: string;
    contractHash: string;
    props: string;
    onHostEvent?: DirectEventHandler<KotlinHostEvent>;
    onHostSizeChange?: DirectEventHandler<KotlinHostSizeEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneKotlinHostNativeComponent.d.ts.map