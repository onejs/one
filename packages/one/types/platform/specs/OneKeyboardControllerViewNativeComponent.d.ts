import type { HostComponent } from 'react-native';
import type { ViewProps } from 'react-native/Libraries/Components/View/ViewPropTypes';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
type KeyboardMoveEvent = Readonly<{
    height: Double;
    progress: Double;
    duration: Int32;
    target: Int32;
}>;
type FocusedInputLayoutChangedEvent = Readonly<{
    target: Int32;
    parentScrollViewTarget: Int32;
    layout: {
        x: Double;
        y: Double;
        width: Double;
        height: Double;
        absoluteX: Double;
        absoluteY: Double;
        contentX: Double;
        contentY: Double;
    };
}>;
type FocusedInputTextChangedEvent = Readonly<{
    text: string;
}>;
type FocusedInputSelectionChangedEvent = Readonly<{
    target: Int32;
    selection: {
        start: {
            x: Double;
            y: Double;
            position: Int32;
        };
        end: {
            x: Double;
            y: Double;
            position: Int32;
        };
    };
}>;
export interface NativeProps extends ViewProps {
    enabled?: boolean;
    statusBarTranslucent?: boolean;
    navigationBarTranslucent?: boolean;
    preserveEdgeToEdge?: boolean;
    onKeyboardMoveStart?: DirectEventHandler<KeyboardMoveEvent>;
    onKeyboardMove?: DirectEventHandler<KeyboardMoveEvent>;
    onKeyboardMoveEnd?: DirectEventHandler<KeyboardMoveEvent>;
    onKeyboardMoveInteractive?: DirectEventHandler<KeyboardMoveEvent>;
    onFocusedInputLayoutChanged?: DirectEventHandler<FocusedInputLayoutChangedEvent>;
    onFocusedInputTextChanged?: DirectEventHandler<FocusedInputTextChangedEvent>;
    onFocusedInputSelectionChanged?: DirectEventHandler<FocusedInputSelectionChangedEvent>;
}
interface NativeCommands {
    synchronizeFocusedInputLayout: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}
export declare const Commands: NativeCommands;
declare const _default: HostComponent<NativeProps>;
export default _default;
//# sourceMappingURL=OneKeyboardControllerViewNativeComponent.d.ts.map