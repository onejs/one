import type { HostComponent } from 'react-native';
import type { ViewProps } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
export interface NativeProps extends ViewProps {
    contentInsetBottom: Double;
    contentInsetTop: Double;
    applyWorkaroundForContentInsetHitTestBug?: boolean;
}
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=OneClippingScrollViewDecoratorViewNativeComponent.d.ts.map