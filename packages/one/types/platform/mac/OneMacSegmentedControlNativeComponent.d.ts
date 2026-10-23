import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
export type ChangeEvent = Readonly<{
    selectedIndex: Int32;
    revision: Int32;
    eventCount: Int32;
}>;
interface NativeProps extends ViewProps {
    labels: ReadonlyArray<string>;
    selectedIndex: Int32;
    disabled?: boolean;
    controlRole?: WithDefault<'automatic' | 'tabs' | 'valueSelection', 'automatic'>;
    revision: Int32;
    acknowledgedEvent: Int32;
    onSelectedIndexChange?: DirectEventHandler<ChangeEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneMacSegmentedControlNativeComponent.d.ts.map