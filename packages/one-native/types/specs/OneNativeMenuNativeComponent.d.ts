import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export type NativeMenuItem = Readonly<{
    parentId: string;
    type: string;
    id: string;
    title: string;
    systemImage: string;
    role: string;
    disabled: boolean;
    hidden: boolean;
    help: string;
    controlGroupStyle: string;
    values: ReadonlyArray<boolean>;
    menuOrder: string;
    menuActionDismissBehavior: string;
}>;
interface NativeProps extends ViewProps {
    items: ReadonlyArray<NativeMenuItem>;
    triggerLabel: string;
    disabled: boolean;
    menuOrder: string;
    menuActionDismissBehavior: string;
    acknowledgedEvent: Int32;
    revision: Int32;
    onNativeMenuAction?: DirectEventHandler<Readonly<{
        id: string;
    }>>;
    onNativeMenuValueChange?: DirectEventHandler<Readonly<{
        id: string;
        value: boolean;
        sourceIndex: Int32;
        eventCount: Int32;
        revision: Int32;
    }>>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativeMenuNativeComponent.d.ts.map