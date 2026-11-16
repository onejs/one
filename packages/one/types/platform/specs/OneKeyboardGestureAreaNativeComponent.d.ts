import type { HostComponent } from 'react-native';
import type { ViewProps } from 'react-native/Libraries/Components/View/ViewPropTypes';
import type { Double, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
export interface NativeProps extends ViewProps {
    interpolator?: WithDefault<'linear' | 'ios', 'linear'>;
    showOnSwipeUp?: boolean;
    enableSwipeToDismiss?: boolean;
    offset?: Double;
    textInputNativeID?: string;
}
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=OneKeyboardGestureAreaNativeComponent.d.ts.map