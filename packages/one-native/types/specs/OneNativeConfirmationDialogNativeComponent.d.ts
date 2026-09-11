import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
type DialogAction = Readonly<{
    id: string;
    label: string;
    role?: string;
}>;
interface NativeProps extends ViewProps {
    value: boolean;
    acknowledgedEvent: Int32;
    revision: Int32;
    title: string;
    message: string;
    actions: ReadonlyArray<DialogAction>;
    titleVisibility: string;
    onNativeConfirmationDialogValueChange?: DirectEventHandler<Readonly<{
        value: boolean;
        eventCount: Int32;
        revision: Int32;
    }>>;
    onNativeConfirmationDialogAction?: DirectEventHandler<Readonly<{
        id: string;
        eventCount: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeConfirmationDialogNativeComponent.d.ts.map