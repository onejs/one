import type { ViewProps } from 'react-native';
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
type SwiftHostEvent = Readonly<{
    name: string;
    args: string;
}>;
interface NativeProps extends ViewProps {
    packageName: string;
    view: string;
    contractHash: string;
    props: string;
    fill: boolean;
    onHostEvent?: DirectEventHandler<SwiftHostEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneSwiftHostNativeComponent.d.ts.map