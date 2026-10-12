import type { HostComponent, ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
import type * as React from 'react';
interface NativeProps extends ViewProps {
}
interface NativeCommands {
    scrollTo(viewRef: React.ElementRef<HostComponent<NativeProps>>, scrollID: string, hasAnchor: boolean, anchorX: Double, anchorY: Double): void;
}
export declare const Commands: NativeCommands;
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeScrollViewReaderNativeComponent.d.ts.map