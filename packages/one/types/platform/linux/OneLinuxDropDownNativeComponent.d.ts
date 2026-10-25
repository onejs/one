import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export type ChangeEvent = Readonly<{
    value: Double;
    revision: Int32;
    eventCount: Int32;
}>;
export type SelectionEvent = Readonly<{
    selection: string;
    hasSelection: boolean;
    revision: Int32;
    eventCount: Int32;
}>;
interface NativeProps extends ViewProps {
    labels: ReadonlyArray<string>;
    itemValues: ReadonlyArray<string>;
    selection: string;
    hasSelection: boolean;
    tagged: boolean;
    value: Double;
    disabled?: boolean;
    revision: Int32;
    acknowledgedEvent: Int32;
    onControlChange?: DirectEventHandler<ChangeEvent>;
    onSelectionChange?: DirectEventHandler<SelectionEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneLinuxDropDownNativeComponent.d.ts.map